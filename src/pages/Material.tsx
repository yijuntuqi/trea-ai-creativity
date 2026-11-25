import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Portrait } from '../types'
import { JUDGES } from '../lib/judges'
import { STRICTNESS_LABEL, judgesOf } from '../lib/labels'
import { ACCEPT_EXTENSIONS, ParseError, parseFile } from '../lib/parse'
import { generatePortrait } from '../lib/portrait'
import { useSessionStore } from '../store/session'
import JudgeCard from '../components/JudgeCard'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Textarea } from '../components/ui/Textarea'

type MaterialFile = {
  id: string
  name: string
  text: string
}

function errorText(error: unknown): string {
  if (error instanceof ParseError) {
    if (error.code === 'unsupported') return '暂不支持该格式'
    return error.message
  }
  return '文件解析失败'
}

function newFileId(): string {
  return `f_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
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

  const [files, setFiles] = useState<MaterialFile[]>([])
  const [text, setText] = useState('')
  const [reuse, setReuse] = useState(() =>
    Boolean(session?.material.text && session.status === 'ready' && !session.questions.length),
  )
  const [portrait, setLocalPortrait] = useState<Portrait | null>(() => session?.portrait ?? null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [stage, setStage] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  if (!session) {
    return (
      <section className="mx-auto max-w-xl space-y-4 text-center">
        <h1 className="font-serif text-2xl text-paper">还没有建场</h1>
        <p className="text-sm text-paper/60">先选择答辩类型与严格度，再上传材料。</p>
        <Button onClick={() => navigate('/setup')}>去建场</Button>
      </section>
    )
  }

  const fileChars = files.reduce((sum, file) => sum + file.text.length, 0)
  const totalChars = fileChars + text.trim().length

  function composeMaterial(): string {
    const parts = files.map((file) => `【文件：${file.name}】\n${file.text}`)
    const manual = text.trim()
    if (manual) parts.push(`【补充说明】\n${manual}`)
    return parts.join('\n\n')
  }

  async function onFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (selected.length === 0) return

    setError(null)
    const failures: string[] = []
    const added: MaterialFile[] = []

    for (const file of selected) {
      try {
        const parsed = await parseFile(file)
        added.push({ id: newFileId(), name: file.name, text: parsed.text })
      } catch (uploadError) {
        failures.push(`${file.name}：${errorText(uploadError)}`)
      }
    }

    if (added.length > 0) setFiles((prev) => [...prev, ...added])
    if (failures.length > 0) setError(failures.join('；'))
  }

  function removeFile(id: string) {
    setFiles((prev) => prev.filter((file) => file.id !== id))
  }

  async function analyze() {
    const materialText = composeMaterial()
    if (!materialText.trim()) {
      setError('请上传文件或粘贴材料内容')
      return
    }
    setError(null)
    setLoading(true)
    setStage('正在读取材料要点…')
    try {
      await setMaterial(
        materialText,
        files.length > 0 ? files.map((file) => file.name).join(' + ') : undefined,
      )
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

  async function regenerate() {
    const current = useSessionStore.getState().session
    if (!current || !current.material.text) return
    setError(null)
    setLoading(true)
    setStage('评委正在重新提炼研究画像…')
    try {
      const result = await generatePortrait(current.material, current.config)
      setLocalPortrait(result.portrait)
      setPortrait(result.portrait)
      if (result.source === 'mock') setMockNotice(true)
    } catch {
      setError('画像生成失败，请重试')
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
          支持 PDF、PPTX、Word、Excel、Markdown、JSON、CSV、TXT，可一次上传多个文件；文件只在浏览器内解析，原始文件不会上传。未登录时记录只在本机，登录后解析文本会同步到云端。
        </p>
      </header>

      {reuse && (
        <Card className="space-y-4">
          <div>
            <p className="text-xs text-paper/40">沿用上一场的材料</p>
            <p className="mt-1 text-sm text-paper/85">
              {session.material.fileName ?? '已保存的材料文本'} · {session.material.chars} 字
            </p>
          </div>
          <p className="text-xs leading-relaxed text-paper/50">
            浏览器只保留了上次解析后的文本，原始文件不会保存。材料有修改时请点「更换材料」重新上传；沿用则直接使用这份文本重新答辩。
          </p>
          {error && <p className="text-sm text-red-300">{error}</p>}
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setReuse(false)
                setLocalPortrait(null)
                setError(null)
              }}
            >
              更换材料
            </Button>
            <Button variant="ghost" disabled={loading} onClick={() => void regenerate()}>
              {loading ? stage || '重新提炼中…' : '重新提炼材料要点'}
            </Button>
            {!portrait && <Button onClick={begin}>直接开始答辩</Button>}
          </div>
        </Card>
      )}

      {!reuse && !portrait && (
        <Card className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <label className="cursor-pointer rounded-full border border-white/15 px-4 py-2 text-sm text-paper/75 transition hover:border-gold/60 hover:text-gold">
              选择文件
              <input
                ref={inputRef}
                type="file"
                aria-label="上传文件"
                multiple
                accept={ACCEPT_EXTENSIONS.join(',')}
                onChange={onFiles}
                className="sr-only"
              />
            </label>
            <span className="text-xs text-paper/40">可多选；论文、报告、实验数据可一起上传</span>
          </div>

          {files.length > 0 && (
            <ul className="space-y-2">
              {files.map((file) => (
                <li
                  key={file.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-ink/40 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-paper/85">{file.name}</p>
                    <p className="text-xs text-paper/40">{file.text.length} 字</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(file.id)}
                    className="shrink-0 rounded-full border border-white/15 px-3 py-1 text-xs text-paper/60 transition hover:border-red-300/60 hover:text-red-300"
                  >
                    删除
                  </button>
                </li>
              ))}
            </ul>
          )}

          <Textarea
            aria-label="材料文本"
            rows={8}
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="也可以把研究问题、方法、结论或 PPT 大纲直接粘贴到这里…"
          />

          <div className="flex items-center justify-between text-xs text-paper/40">
            <span>共 {totalChars} 字（全文参与分析，不做截断）</span>
            <span>{files.length > 0 ? `${files.length} 个文件` : '未上传文件'}</span>
          </div>

          {error && <p className="text-sm text-red-300">{error}</p>}

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
              {JUDGES.filter((judge) => judgesOf(session.config).includes(judge.id)).map((judge) => (
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
