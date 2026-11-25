import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { Portrait } from '../types'
import { JUDGES, judgeById } from '../lib/judges'
import { STRICTNESS_SHORT, typeLabel } from '../lib/labels'
import { isSpeechSupported, speak, stopSpeaking } from '../lib/tts'
import { useDefenseEngine } from '../hooks/useDefenseEngine'
import { useElapsedTimer } from '../hooks/useElapsedTimer'
import { useSessionStore } from '../store/session'
import ChatBubble from '../components/ChatBubble'
import JudgeCard from '../components/JudgeCard'
import MockBadge from '../components/MockBadge'
import Timer from '../components/Timer'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Textarea } from '../components/ui/Textarea'

function PortraitPoints({ portrait }: { portrait: Portrait }) {
  return (
    <div className="space-y-3 text-sm leading-relaxed text-paper/80">
      <div>
        <p className="text-xs text-paper/40">题目</p>
        <p className="mt-1">{portrait.topic}</p>
      </div>
      <div>
        <p className="text-xs text-paper/40">方法</p>
        <p className="mt-1">{portrait.method}</p>
      </div>
      <div>
        <p className="text-xs text-paper/40">创新点</p>
        <ul className="mt-1 space-y-1">
          {portrait.innovation.map((item) => (
            <li key={item} className="flex gap-2">
              <span className="text-gold/60">·</span>
              {item}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="text-xs text-paper/40">局限</p>
        <ul className="mt-1 space-y-1">
          {portrait.limitations.map((item) => (
            <li key={item} className="flex gap-2">
              <span className="text-gold/60">·</span>
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export default function Session() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const session = useSessionStore((state) => state.session)
  const mockNotice = useSessionStore((state) => state.mockNotice)
  const restore = useSessionStore((state) => state.restore)
  const engine = useDefenseEngine()

  const [checked, setChecked] = useState(false)
  const [answerText, setAnswerText] = useState('')
  const [ttsOn, setTtsOn] = useState(() => {
    try {
      return localStorage.getItem('dr:tts') === '1'
    } catch {
      return false
    }
  })
  const startedRef = useRef(false)

  useEffect(() => {
    if (id && useSessionStore.getState().session?.id !== id) restore(id)
    setChecked(true)
  }, [id, restore])

  const pending = session
    ? [...session.questions].reverse().find((question) => question.answer === undefined)
    : undefined

  useEffect(() => {
    if (startedRef.current) return
    const current = useSessionStore.getState().session
    if (!current || current.id !== id) return
    if (current.status !== 'ongoing' || current.questions.length > 0) return
    startedRef.current = true
    void engine.ask()
  }, [id, session?.id, session?.questions.length])

  const { seconds, reset } = useElapsedTimer(Boolean(pending) && !engine.busy)

  useEffect(() => {
    reset()
  }, [pending?.id, reset])

  useEffect(() => {
    if (!ttsOn || !pending) return
    speak(pending.text)
  }, [ttsOn, pending?.id])

  useEffect(() => () => stopSpeaking(), [])

  if (!checked) return null

  if (!session) {
    return (
      <section className="mx-auto max-w-xl space-y-4 text-center">
        <h1 className="font-serif text-2xl text-paper">未找到该场次</h1>
        <p className="text-sm text-paper/60">记录可能已被清理，请重新建场。</p>
        <Button onClick={() => navigate('/setup')}>重新建场</Button>
      </section>
    )
  }

  const currentJudge = pending
    ? judgeById(pending.judgeId)
    : session.questions.length > 0
      ? judgeById(session.questions[session.questions.length - 1].judgeId)
      : JUDGES[0]

  function toggleTts() {
    const next = !ttsOn
    setTtsOn(next)
    try {
      localStorage.setItem('dr:tts', next ? '1' : '0')
    } catch {
      // 忽略存储失败
    }
    if (!next) stopSpeaking()
  }

  async function submit() {
    const text = answerText
    if (!text.trim()) return
    await engine.answer(text)
    const latest = useSessionStore.getState().session
    if (latest?.questions.some((question) => question.answer === text.trim())) setAnswerText('')
  }

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl text-paper">答辩室</h1>
          <p className="mt-1 text-xs text-paper/50">
            {typeLabel(session.config)} · {STRICTNESS_SHORT[session.config.strictness]}模式 ·
            共 {session.questions.length} 题
          </p>
        </div>
        <div className="flex items-center gap-3">
          {mockNotice && <MockBadge />}
          {isSpeechSupported() && (
            <Button variant="ghost" aria-pressed={ttsOn} onClick={toggleTts}>
              朗读{ttsOn ? '开' : '关'}
            </Button>
          )}
        </div>
      </header>

      <details className="rounded-2xl border border-white/10 bg-ink-soft/60 p-4 lg:hidden">
        <summary className="cursor-pointer text-sm text-gold/80">材料要点</summary>
        <div className="mt-3">
          {session.portrait ? (
            <PortraitPoints portrait={session.portrait} />
          ) : (
            <p className="text-sm text-paper/50">未生成画像，按材料原文作答。</p>
          )}
        </div>
      </details>

      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)_230px]">
        <aside className="hidden lg:block">
          <Card className="space-y-4 lg:sticky lg:top-20">
            <h2 className="text-xs tracking-[0.2em] text-gold/70">材料要点</h2>
            {session.portrait ? (
              <PortraitPoints portrait={session.portrait} />
            ) : (
              <p className="text-sm text-paper/50">未生成画像，按材料原文作答。</p>
            )}
          </Card>
        </aside>

        <div className="space-y-4">
          <Card className="max-h-[52vh] min-h-[280px] space-y-4 overflow-y-auto">
            {session.messages.length === 0 ? (
              <p className="py-10 text-center text-sm text-paper/40">评委正在准备第一个问题…</p>
            ) : (
              session.messages.map((message) => <ChatBubble key={message.id} message={message} />)
            )}
          </Card>

          <Card className="sticky bottom-0 z-20 space-y-3 backdrop-blur lg:static">
            <Textarea
              aria-label="回答"
              rows={4}
              value={answerText}
              onChange={(event) => setAnswerText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  void submit()
                }
              }}
              placeholder="输入你的回答，Enter 提交，Shift+Enter 换行…"
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-paper/40">{answerText.trim().length} 字</span>
              <div className="flex items-center gap-2">
                {!pending && session.questions.length > 0 && session.status === 'ongoing' && (
                  <Button variant="ghost" disabled={engine.busy} onClick={() => void engine.ask()}>
                    下一题
                  </Button>
                )}
                <Button disabled={engine.busy || !pending || !answerText.trim()} onClick={() => void submit()}>
                  提交回答
                </Button>
              </div>
            </div>
            {engine.error && <p className="text-xs text-red-300">{engine.error}</p>}
          </Card>
        </div>

        <aside className="order-first space-y-4 lg:order-none">
          <Card className="sticky top-16 z-20 space-y-3 bg-ink-soft/90 backdrop-blur lg:static lg:bg-ink-soft/70">
            <div className="flex items-center justify-between">
              <h2 className="text-xs tracking-[0.2em] text-gold/70">当前评委</h2>
              <Timer seconds={seconds} limit={pending?.suggestedSeconds} />
            </div>
            <JudgeCard judge={currentJudge} />
            <p className="text-xs leading-relaxed text-paper/50">
              {pending ? `考察点：${pending.intent || '现场追问'}` : '本题已点评，可继续下一题或结束。'}
            </p>
          </Card>

          <div className="flex flex-col gap-2">
            <Button variant="ghost" disabled={engine.busy || !pending} onClick={() => void engine.hint()}>
              给我提示
            </Button>
            <Button variant="ghost" disabled={engine.busy || !pending} onClick={() => void engine.skip()}>
              跳过本题
            </Button>
            <Button disabled={engine.busy} onClick={() => void engine.finish()}>
              结束并出报告
            </Button>
          </div>
        </aside>
      </div>
    </section>
  )
}
