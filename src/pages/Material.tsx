import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Portrait, Strictness } from '../types'
import { JUDGES } from '../lib/judges'
import { ParseError, parseFile } from '../lib/parse'
import { generatePortrait } from '../lib/portrait'
import { useSessionStore } from '../store/session'
import JudgeCard from '../components/JudgeCard'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Textarea } from '../components/ui/Textarea'

const STRICTNESS_LABEL: Record<Strictness, string> = {
  gentle: '温和（鼓励为主）',
  standard: '标准',
  press: '压力（连续追问）',
}

function errorText(error: unknown): string {
  if (error instanceof ParseError) {
    if (error.code === 'no-text') return '未识别到文本，请粘贴大纲'
    if (error.code === 'unsupported') return '暂不支持该格式，请粘贴文本'
  }
  return '文件解析失败，请粘贴文本'
}

function Point({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-paper/40">{label}</p>
      <p className="mt-1 text-sm leading-relaxed text-paper/85">{value}</p>
    </div>
  )
}

function PointList({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <p className="text-xs text-paper/40">{label}</p>
      <ul className="mt-1 space-y-1 text-sm leading-relaxed text-paper/85">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="text-gold/60">·</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function Material() {
  const navigate = useNavigate()
  const session = useSessionStore((state) => state.session)
  const setMaterial = useSessionStore((state) => state.setMaterial)
  const setPortrait = useSessionStore((state) => state.setPortrait)
  const setMockNotice = useSessionStore((state) => state.setMockNotice)

  const [text, setText] = useState('')
  const [fileName, setFileName] = useState<string | undefined>(undefined)
  const [portrait, setLocalPortrait] = useState<Portrait | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [stage, setStage] = useState('')

  if (!session) {
    return (
      <section className="mx-auto max-w-xl space-y-4 text-center">
        <h1 className="font-serif text-2xl text-paper">还没有建场</h1>
        <p className="text-sm text-paper/60">先选择答辩类型与严格度，再上传材料。</p>
        <Button onClick={() => navigate('/setup')}>去建场</Button>
      </section>
    )
  }

  async function onFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setError(null)
    setWarning(null)
    try {
      const parsed = await parseFile(file)
      setFileName(file.name)
      setText(parsed.text)
      if (parsed.warning) setWarning(parsed.warning)
      if (!parsed.text.trim()) setError('请粘贴或上传有效内容')
    } catch (uploadError) {
      setError(errorText(uploadError))
    }
  }

  async function analyze() {
    if (!text.trim()) {
      setError('请粘贴或上传有效内容')
      return
    }
    setError(null)
    setLoading(true)
    setStage('正在读取材料要点…')
    try {
      await setMaterial(text, fileName)
      const current = useSessionStore.getState().session
      if (!current) return
      setStage('评委正在提炼研究画像…')
      const result = await generatePortrait(current.material, current.config)
      setLocalPortrait(result.portrait)
      setPortrait(result.portrait)
      if (result.source === 'mock') setMockNotice(true)
    } catch {
      setError('画像生成过程中断，请重试；也可以直接开始答辩。')
    } finally {
      setLoading(false)
      setStage('')
    }
  }

  function begin() {
    const current = useSessionStore.getState().session
    if (!current) return
    useSessionStore.getState().begin()
    navigate(`/session/${current.id}`)
  }

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="font-serif text-3xl text-paper">上传材料</h1>
        <p className="mt-2 text-sm text-paper/60">
          支持 PDF、PPTX 与纯文本粘贴；文件只在浏览器内解析，不会上传。
        </p>
      </header>

      {!portrait && (
        <Card className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <label className="cursor-pointer rounded-full border border-white/15 px-4 py-2 text-sm text-paper/75 transition hover:border-gold/60 hover:text-gold">
              选择文件
              <input
                type="file"
                aria-label="上传文件"
                accept=".pdf,.pptx,.txt"
                onChange={onFile}
                className="sr-only"
              />
            </label>
            <span className="text-xs text-paper/40">
              {fileName ?? '也可以直接把论文摘要或大纲粘贴到下方'}
            </span>
          </div>

          <Textarea
            aria-label="材料文本"
            rows={10}
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="粘贴研究问题、方法、结论或 PPT 大纲…"
          />

          <div className="flex items-center justify-between text-xs text-paper/40">
            <span>{text.trim().length} 字</span>
            <span>解析后自动截断至约 4000 字</span>
          </div>

          {error && <p className="text-sm text-red-300">{error}</p>}
          {warning && <p className="text-sm text-gold/80">{warning}</p>}

          <div className="flex justify-end">
            <Button onClick={analyze} disabled={loading}>
              {loading ? stage || '分析中…' : '解析并生成画像'}
            </Button>
          </div>
        </Card>
      )}

      {portrait && (
        <>
          <Card className="space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs text-paper/40">画像主题</p>
                <h2 className="mt-1 font-serif text-xl text-paper">{portrait.topic}</h2>
              </div>
              <span className="shrink-0 rounded-full border border-gold/40 px-3 py-1 text-xs text-gold/80">
                {STRICTNESS_LABEL[session.config.strictness]}
              </span>
            </div>

            <Point label="研究问题" value={portrait.problem} />
            <Point label="方法" value={portrait.method} />
            <PointList label="创新点" items={portrait.innovation} />
            <PointList label="关键证据" items={portrait.evidence} />
            <PointList label="局限" items={portrait.limitations} />
            <PointList label="关键词" items={portrait.keywords} />
          </Card>

          <section>
            <h2 className="mb-3 font-serif text-xl text-paper">本场评委</h2>
            <div className="grid gap-4 md:grid-cols-3">
              {JUDGES.map((judge) => (
                <JudgeCard key={judge.id} judge={judge} />
              ))}
            </div>
          </section>

          <div className="flex justify-end">
            <Button size="lg" onClick={begin}>
              开始答辩
            </Button>
          </div>
        </>
      )}
    </section>
  )
}
