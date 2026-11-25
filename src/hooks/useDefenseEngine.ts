import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { JudgeId, Question, ReportModelOutput, Session } from '../types'
import type { LLMTask } from '../lib/prompts'
import { useSessionStore } from '../store/session'
import { runTask } from '../lib/llm'
import { parseLooseJSON } from '../lib/json'
import { finalizeReport } from '../lib/report'
import { canCallToday, consumeCall } from '../lib/quota'

type QuestionOutput = {
  judgeId?: JudgeId
  text?: string
  intent?: string
  suggestedSeconds?: number
}

type EvaluateOutput = {
  score?: number
  comment?: string
  modelAnswer?: string
  followUp?: string | null
}

const JUDGE_CYCLE: JudgeId[] = ['method', 'innovation', 'application']

function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}

function pickJudge(questions: Question[]): JudgeId {
  const recent = questions.slice(-2).map((question) => question.judgeId)
  const start = questions.length % JUDGE_CYCLE.length
  for (let i = 0; i < JUDGE_CYCLE.length; i += 1) {
    const candidate = JUDGE_CYCLE[(start + i) % JUDGE_CYCLE.length]
    if (recent.length < 2 || recent[0] !== candidate || recent[1] !== candidate) return candidate
  }
  return JUDGE_CYCLE[start]
}

function guardJudge(returned: JudgeId | undefined, preferred: JudgeId, questions: Question[]): JudgeId {
  if (!returned || !JUDGE_CYCLE.includes(returned)) return preferred
  const recent = questions.slice(-2).map((question) => question.judgeId)
  if (recent.length === 2 && recent[0] === returned && recent[1] === returned) return preferred
  return returned
}

function clampScore(value: unknown): number {
  const number = Number(value)
  if (!Number.isFinite(number)) return 0
  return Math.max(0, Math.min(100, Math.round(number)))
}

function normalizeOutput(raw: ReportModelOutput): ReportModelOutput | null {
  if (!raw || typeof raw !== 'object' || !raw.dimensions) return null
  const values = [raw.dimensions.accuracy, raw.dimensions.logic, raw.dimensions.depth, raw.dimensions.clarity]
  if (values.some((value) => typeof value !== 'number' || Number.isNaN(value))) return null
  return {
    dimensions: raw.dimensions,
    summary: typeof raw.summary === 'string' ? raw.summary : '',
    checklist: Array.isArray(raw.checklist)
      ? raw.checklist.filter((item): item is string => typeof item === 'string')
      : [],
    topRisks: Array.isArray(raw.topRisks)
      ? raw.topRisks.filter((item) => item && typeof item.question === 'string')
      : [],
    questionReviews: Array.isArray(raw.questionReviews)
      ? raw.questionReviews.filter((item) => item && typeof item.questionId === 'string')
      : [],
  }
}

function fallbackOutput(session: Session): ReportModelOutput {
  const scored = session.questions.filter((question) => typeof question.score === 'number')
  const average = scored.length
    ? Math.round(scored.reduce((sum, question) => sum + (question.score ?? 0), 0) / scored.length)
    : 0
  return {
    dimensions: { accuracy: average, logic: average, depth: average, clarity: average },
    summary: '报告生成失败，已按逐题得分均值给出兜底结果，请结合逐题点评复盘。',
    checklist: [],
    topRisks: [],
    questionReviews: session.questions.map((question) => ({
      questionId: question.id,
      question: question.text,
      answer: question.answer ?? '',
      score: question.score ?? 0,
      comment: question.comment ?? '暂无点评',
      modelAnswer: question.modelAnswer ?? '暂无参考话术',
    })),
  }
}

export function useDefenseEngine(): {
  busy: boolean
  error: string | null
  ask(): Promise<void>
  answer(text: string): Promise<void>
  hint(): Promise<string>
  skip(): Promise<void>
  finish(): Promise<void>
} {
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // 预取下一题：点评结束后后台生成，用户点「下一题」时直接秒出
  const queuedRef = useRef<Question | null>(null)
  const preparingRef = useRef<Promise<Question | null> | null>(null)

  async function runCall(task: LLMTask, payload: Record<string, unknown>): Promise<string> {
    const current = useSessionStore.getState().session
    if (!current) throw new Error('NO_SESSION')
    const forceMock = !canCallToday()
    const result = await runTask(
      { task, payload, sessionId: current.material.hash || current.id },
      () => {},
      { forceMock },
    )
    if (!forceMock) consumeCall()
    if (result.source === 'mock') useSessionStore.getState().setMockNotice(true)
    return result.text
  }

  async function generateQuestion(level: 0 | 1 | 2): Promise<Question | null> {
    const current = useSessionStore.getState().session
    if (!current) return null
    const previous = current.questions[current.questions.length - 1]
    const preferred = level > 0 && previous ? previous.judgeId : pickJudge(current.questions)
    const raw = await runCall('question', {
      material: current.material.text,
      config: current.config,
      portrait: current.portrait,
      strictness: current.config.strictness,
      followUpLevel: level,
      judge: preferred,
      recentMessages: current.messages.slice(-6).map((message) => ({
        role: message.role,
        text: message.text,
      })),
    })
    const parsed = parseLooseJSON<QuestionOutput>(raw)
    if (!parsed.text) throw new Error('EMPTY_QUESTION')

    const suggested = Number(parsed.suggestedSeconds)
    return {
      id: newId('q'),
      judgeId: level > 0 ? preferred : guardJudge(parsed.judgeId, preferred, current.questions),
      text: parsed.text,
      intent: parsed.intent ?? '',
      suggestedSeconds: Number.isFinite(suggested) && suggested > 0 ? suggested : level > 0 ? 60 : 90,
      followUpLevel: level,
    }
  }

  function commitQuestion(question: Question): void {
    const store = useSessionStore.getState()
    store.addQuestion(question)
    store.addMessage({
      id: newId('m'),
      role: 'judge',
      judgeId: question.judgeId,
      text: question.text,
      createdAt: Date.now(),
    })
  }

  function prepareNext(): void {
    if (queuedRef.current || preparingRef.current) return
    const promise = generateQuestion(0)
      .then((question) => {
        if (question) queuedRef.current = question
        return question
      })
      .catch(() => null)
    preparingRef.current = promise
    void promise.finally(() => {
      if (preparingRef.current === promise) preparingRef.current = null
    })
  }

  async function doAsk(level: 0 | 1 | 2): Promise<void> {
    setBusy(true)
    setError(null)
    try {
      let question: Question | null = null
      const cached = queuedRef.current
      if (cached && level === 0 && cached.followUpLevel === 0) {
        queuedRef.current = null
        question = cached
      } else if (level > 0) {
        queuedRef.current = null
      }

      if (!question && level === 0 && preparingRef.current) {
        question = await preparingRef.current
      }
      if (!question) question = await generateQuestion(level)
      if (!question) throw new Error('EMPTY_QUESTION')

      commitQuestion(question)
    } catch {
      setError('提问失败，请重试')
    } finally {
      setBusy(false)
    }
  }

  async function ask(): Promise<void> {
    if (busy) return
    await doAsk(0)
  }

  async function answer(text: string): Promise<void> {
    const trimmed = text.trim()
    if (trimmed.length < 10) {
      setError('回答太短，请至少写 10 个字')
      return
    }

    const current = useSessionStore.getState().session
    if (!current) return
    const pending = [...current.questions].reverse().find((question) => question.answer === undefined)
    if (!pending) {
      setError('当前没有待回答的问题')
      return
    }

    setBusy(true)
    setError(null)
    try {
      const store = useSessionStore.getState()
      store.answerQuestion(pending.id, trimmed, 0)
      store.addMessage({ id: newId('m'), role: 'user', text: trimmed, createdAt: Date.now() })

      const raw = await runCall('evaluate', {
        material: current.material.text,
        config: current.config,
        portrait: current.portrait,
        question: pending.text,
        answer: trimmed,
      })
      const parsed = parseLooseJSON<EvaluateOutput>(raw)
      const score = clampScore(parsed.score)
      const comment = parsed.comment || '暂无点评'

      const latest = useSessionStore.getState()
      latest.evaluateQuestion(pending.id, score, comment, parsed.modelAnswer || '暂无参考话术')
      latest.addMessage({
        id: newId('m'),
        role: 'system',
        text: `点评（${score} 分）：${comment}`,
        createdAt: Date.now(),
      })

      if (parsed.followUp && pending.followUpLevel < 2) {
        await doAsk((pending.followUpLevel + 1) as 1 | 2)
      } else {
        // 点评已出，后台预取下一题，用户点「下一题」时无需再等
        prepareNext()
      }
    } catch {
      setError('点评生成失败，请重试')
    } finally {
      setBusy(false)
    }
  }

  async function hint(): Promise<string> {
    const current = useSessionStore.getState().session
    if (!current) return ''
    const pending =
      [...current.questions].reverse().find((question) => question.answer === undefined) ??
      current.questions[current.questions.length - 1]
    if (!pending) return ''

    setBusy(true)
    setError(null)
    try {
      const raw = await runCall('hint', {
        material: current.material.text,
        question: pending.text,
        answer: pending.answer ?? '',
      })
      const text = raw.trim()
      useSessionStore.getState().addMessage({
        id: newId('m'),
        role: 'system',
        text: `教练提示：${text}`,
        createdAt: Date.now(),
      })
      return text
    } catch {
      setError('提示生成失败，请重试')
      return ''
    } finally {
      setBusy(false)
    }
  }

  async function skip(): Promise<void> {
    const current = useSessionStore.getState().session
    if (!current) return
    const pending = [...current.questions].reverse().find((question) => question.answer === undefined)
    if (!pending) return

    const store = useSessionStore.getState()
    store.answerQuestion(pending.id, '（本题已跳过）', 0)
    store.addMessage({
      id: newId('m'),
      role: 'system',
      text: '已跳过本题。',
      createdAt: Date.now(),
    })
    await doAsk(0)
  }

  async function finish(): Promise<void> {
    const current = useSessionStore.getState().session
    if (!current || busy) return

    setBusy(true)
    setError(null)
    try {
      const payload = {
        material: current.material.text,
        config: current.config,
        portrait: current.portrait,
        questions: current.questions.map((question) => ({
          id: question.id,
          text: question.text,
          answer: question.answer ?? '',
          score: question.score ?? 0,
          comment: question.comment ?? '',
        })),
      }

      let output: ReportModelOutput | null = null
      for (let attempt = 0; attempt < 2 && !output; attempt += 1) {
        try {
          const raw = await runCall('report', payload)
          output = normalizeOutput(parseLooseJSON<ReportModelOutput>(raw))
        } catch {
          // 第一次失败后重试一次
        }
      }

      const report = finalizeReport(output ?? fallbackOutput(current), current)
      useSessionStore.getState().finish(report)
      navigate(`/report/${current.id}`)
    } catch {
      setError('报告生成失败，请重试')
    } finally {
      setBusy(false)
    }
  }

  return { busy, error, ask, answer, hint, skip, finish }
}
