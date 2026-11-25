import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { JudgeId, Question, ReportModelOutput, Session } from '../types'
import type { LLMTask } from '../lib/prompts'
import { useSessionStore } from '../store/session'
import { runTask } from '../lib/llm'
import { mockTask } from '../lib/mock'
import { parseLooseJSON } from '../lib/json'
import { finalizeReport } from '../lib/report'
import { canCallToday, consumeCall } from '../lib/quota'
import { MAX_QUESTION_TARGET, judgesOf, targetOf } from '../lib/labels'

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

function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}

function pickJudge(questions: Question[], pool: JudgeId[]): JudgeId {
  const recent = questions.slice(-2).map((question) => question.judgeId)
  const start = questions.length % pool.length
  for (let i = 0; i < pool.length; i += 1) {
    const candidate = pool[(start + i) % pool.length]
    if (recent.length < 2 || recent[0] !== candidate || recent[1] !== candidate) return candidate
  }
  return pool[start]
}

function guardJudge(
  returned: JudgeId | undefined,
  preferred: JudgeId,
  questions: Question[],
  pool: JudgeId[],
): JudgeId {
  if (!returned || !pool.includes(returned)) return preferred
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
  answer(text: string): Promise<boolean>
  extend(n: number): Promise<void>
  hint(): Promise<string>
  skip(): Promise<void>
  finish(): Promise<void>
} {
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // 预取下一题：题目一出就在后台生成，点评结束时可立即抛出
  const queuedRef = useRef<Question | null>(null)
  const preparingRef = useRef<Promise<Question | null> | null>(null)

  async function runCall(
    task: LLMTask,
    payload: Record<string, unknown>,
    opts: { fallbackToMock?: boolean } = {},
  ): Promise<string> {
    const current = useSessionStore.getState().session
    if (!current) throw new Error('NO_SESSION')
    const forceMock = !canCallToday()
    const result = await runTask(
      { task, payload, sessionId: current.material.hash || current.id },
      () => {},
      { forceMock, fallbackToMock: opts.fallbackToMock },
    )
    if (!forceMock) consumeCall()
    if (result.source === 'mock') useSessionStore.getState().setMockNotice(true)
    return result.text
  }

  async function generateQuestion(): Promise<Question | null> {
    const current = useSessionStore.getState().session
    if (!current) return null
    const pool = judgesOf(current.config)
    const preferred = pickJudge(current.questions, pool)
    const raw = await runCall('question', {
      material: current.material.text,
      config: current.config,
      portrait: current.portrait,
      strictness: current.config.strictness,
      followUpLevel: 0,
      questionIndex: current.questions.length + 1,
      questionTotal: Math.max(targetOf(current.config), current.questions.length + 1),
      judge: preferred,
      judges: pool,
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
      judgeId: guardJudge(parsed.judgeId, preferred, current.questions, pool),
      text: parsed.text,
      intent: parsed.intent ?? '',
      suggestedSeconds: Number.isFinite(suggested) && suggested > 0 ? suggested : 90,
      followUpLevel: 0,
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
    prepareNext()
  }

  function prepareNext(): void {
    if (queuedRef.current || preparingRef.current) return
    const current = useSessionStore.getState().session
    // 达到本场目标题量后不再自动出题，由用户手动加题
    if (!current || current.questions.length >= targetOf(current.config)) return
    const promise = generateQuestion()
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

  async function askInternal(): Promise<boolean> {
    try {
      let question: Question | null = queuedRef.current
      if (question) {
        queuedRef.current = null
      } else if (preparingRef.current) {
        question = await preparingRef.current
      }
      if (!question) question = await generateQuestion()
      if (!question) throw new Error('EMPTY_QUESTION')

      commitQuestion(question)
      return true
    } catch {
      setError('提问失败，请重试')
      return false
    }
  }

  async function ask(): Promise<void> {
    if (busy) return
    const current = useSessionStore.getState().session
    if (!current || current.status !== 'ongoing') return
    if (current.questions.length >= targetOf(current.config)) return
    setBusy(true)
    setError(null)
    try {
      await askInternal()
    } finally {
      setBusy(false)
    }
  }

  async function extend(n: number): Promise<void> {
    if (busy) return
    const current = useSessionStore.getState().session
    if (!current) return
    const next = Math.min(MAX_QUESTION_TARGET, targetOf(current.config) + n)
    useSessionStore.getState().updateConfig({ questionTarget: next })
    await ask()
  }

  async function evaluateAnswer(payload: Record<string, unknown>): Promise<EvaluateOutput | null> {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const raw = await runCall('evaluate', payload, { fallbackToMock: false })
        const parsed = parseLooseJSON<EvaluateOutput>(raw)
        if (typeof parsed.comment === 'string' && parsed.comment.trim()) return parsed
      } catch {
        // 第一次失败（超时/截断/网络）后立即重试一次
      }
    }
    return null
  }

  async function answer(text: string): Promise<boolean> {
    const trimmed = text.trim()
    if (trimmed.length < 10) {
      setError('回答太短，请至少写 10 个字')
      return false
    }

    const current = useSessionStore.getState().session
    if (!current) return false
    const pending = [...current.questions].reverse().find((question) => question.answer === undefined)
    if (!pending) {
      setError('当前没有待回答的问题')
      return false
    }

    setBusy(true)
    setError(null)
    try {
      const store = useSessionStore.getState()
      store.answerQuestion(pending.id, trimmed, 0)
      store.addMessage({ id: newId('m'), role: 'user', text: trimmed, createdAt: Date.now() })

      const payload = {
        material: current.material.text,
        config: current.config,
        portrait: current.portrait,
        question: pending.text,
        answer: trimmed,
      }
      // 优先真实点评：失败重试一次；仍失败才降级为演示数据，避免流程卡死
      let parsed = await evaluateAnswer(payload)
      if (!parsed) {
        parsed = parseLooseJSON<EvaluateOutput>(mockTask('evaluate', payload))
        useSessionStore.getState().setMockNotice(true)
      }
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

      // 未达本场目标题量则立刻抛出下一题；到达上限后停止，等用户加题或结束
      const after = useSessionStore.getState().session
      if (after && after.questions.length < targetOf(after.config)) {
        await askInternal()
      }
      return true
    } catch {
      setError('点评生成失败，请重试')
      return false
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

    setBusy(true)
    setError(null)
    try {
      const store = useSessionStore.getState()
      store.answerQuestion(pending.id, '（本题已跳过）', 0)
      store.addMessage({
        id: newId('m'),
        role: 'system',
        text: '已跳过本题。',
        createdAt: Date.now(),
      })
      const latest = useSessionStore.getState().session
      if (latest && latest.questions.length < targetOf(latest.config)) {
        await askInternal()
      }
    } finally {
      setBusy(false)
    }
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
          // 报告不做 mock 兜底：失败重试，最终用逐题真实点评组装报告
          const raw = await runCall('report', payload, { fallbackToMock: false })
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

  return { busy, error, ask, answer, extend, hint, skip, finish }
}
