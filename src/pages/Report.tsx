import { useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toPng } from 'html-to-image'
import { getSession } from '../lib/storage'
import { DEMO_SESSION } from '../mocks/demo'
import { useSessionStore } from '../store/session'
import ScoreRadar from '../components/ScoreRadar'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'

export default function Report() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const session = (id ? getSession(id) : undefined) ?? (id === DEMO_SESSION.id ? DEMO_SESSION : undefined)
  const report = session?.report
  const startRetry = useSessionStore((state) => state.startRetry)
  const reportRef = useRef<HTMLDivElement>(null)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [openAll, setOpenAll] = useState(false)

  if (!session || !report) {
    return (
      <section className="mx-auto max-w-xl space-y-4 text-center">
        <h1 className="font-serif text-2xl text-paper">报告不存在</h1>
        <p className="text-sm text-paper/60">该场次可能已被删除，或还没有生成报告。</p>
        <Button onClick={() => navigate('/')}>返回首页</Button>
      </section>
    )
  }

  async function exportImage() {
    if (!reportRef.current) return
    setExporting(true)
    setExportError(null)
    // 先展开逐题点评，等 DOM 完成布局后再整页截图
    setOpenAll(true)
    try {
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
      const node = reportRef.current
      const dataUrl = await toPng(node, {
        backgroundColor: '#0B1220',
        pixelRatio: 2,
        width: node.scrollWidth,
        height: node.scrollHeight,
        style: { maxHeight: 'none', overflow: 'visible' },
      })
      const link = document.createElement('a')
      link.href = dataUrl
      link.download = `答辩预演报告-${id ?? 'report'}.png`
      link.click()
    } catch {
      setExportError('导出失败，请截图保存')
    } finally {
      setExporting(false)
    }
  }

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs tracking-[0.3em] text-gold/70">预演报告</p>
          <h1 className="mt-2 font-serif text-3xl text-paper">本场答辩复盘</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => setOpenAll((prev) => !prev)}>
            {openAll ? '收起逐题点评' : '展开逐题点评'}
          </Button>
          <Button variant="ghost" disabled={exporting} onClick={() => void exportImage()}>
            {exporting ? '正在生成…' : '保存报告图片'}
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              startRetry(session)
              navigate('/material')
            }}
          >
            用这份材料再练
          </Button>
          <Button onClick={() => navigate('/setup')}>再来一场</Button>
        </div>
      </div>
      {exportError && <p className="text-xs text-red-300">{exportError}</p>}

      <div ref={reportRef} className="space-y-6">
        <Card className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-24 h-56 w-56 rounded-full bg-gold/10 blur-3xl"
          />
          <div className="relative flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-[11px] tracking-[0.28em] text-paper/40">总分</p>
              <p className="mt-2 font-serif text-7xl leading-none tracking-tight text-gold">
                {report.total}
              </p>
              <div className="mt-4 h-px w-24 bg-gradient-to-r from-gold/70 to-transparent" />
            </div>
            <div className="max-w-md text-right">
              <span className="inline-block rounded-full border border-gold/40 bg-gold/10 px-4 py-1 text-sm text-gold shadow-[0_10px_30px_-18px_rgba(230,181,99,0.8)]">
                {report.level}
              </span>
              <p className="mt-4 text-sm leading-relaxed text-paper/65">{report.summary}</p>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="mb-2 text-sm tracking-[0.2em] text-gold/70">四维评分</h2>
          <ScoreRadar dimensions={report.dimensions} />
        </Card>

        <Card className="space-y-3">
          <h2 className="text-sm tracking-[0.2em] text-gold/70">高危问题 Top 5</h2>
          {report.topRisks.length === 0 ? (
            <p className="text-sm text-paper/50">本场没有记录到高危问题。</p>
          ) : (
            <ol className="space-y-3">
              {report.topRisks.map((risk, index) => (
                <li key={`${risk.question}-${index}`} className="text-sm leading-relaxed">
                  <p className="text-paper/85">
                    {index + 1}. {risk.question}
                  </p>
                  <p className="mt-1 text-xs text-paper/50">原因：{risk.reason}</p>
                </li>
              ))}
            </ol>
          )}
        </Card>

        <Card className="space-y-3">
          <h2 className="text-sm tracking-[0.2em] text-gold/70">逐题点评</h2>
          {report.questions.map((review, index) => (
            <details
              key={review.questionId}
              open={openAll || undefined}
              className="rounded-xl border border-white/10 bg-ink/40 p-3"
            >
              <summary className="cursor-pointer text-sm text-paper/85">
                第 {index + 1} 题 · {review.question}
                <span className="ml-2 text-xs text-gold/80">{review.score} 分</span>
              </summary>
              <div className="mt-3 space-y-2 text-sm leading-relaxed">
                <p className="text-paper/60">你的回答：{review.answer || '未作答'}</p>
                <p className="text-paper/85">点评：{review.comment}</p>
                <p className="text-paper/60">参考回答：{review.modelAnswer}</p>
              </div>
            </details>
          ))}
        </Card>

        <Card className="space-y-3">
          <h2 className="text-sm tracking-[0.2em] text-gold/70">复盘清单</h2>
          <ul className="space-y-2 text-sm leading-relaxed text-paper/80">
            {report.checklist.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="text-gold/60">·</span>
                {item}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </section>
  )
}
