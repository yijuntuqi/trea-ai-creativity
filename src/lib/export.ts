import { toJpeg, toPng } from 'html-to-image'
import { jsPDF } from 'jspdf'
import type { DimensionScores, Session } from '../types'
import { disciplineLabel, typeLabel } from './labels'

export type ExportFormat = 'png' | 'jpg' | 'pdf' | 'docx' | 'md'

export const EXPORT_OPTIONS: { value: ExportFormat; label: string }[] = [
  { value: 'png', label: 'PNG 图片' },
  { value: 'jpg', label: 'JPG 图片' },
  { value: 'pdf', label: 'PDF 文档' },
  { value: 'docx', label: 'Word 文档' },
  { value: 'md', label: 'Markdown' },
]

const DIMENSION_LABEL: Record<keyof DimensionScores, string> = {
  accuracy: '准确性',
  logic: '逻辑性',
  depth: '深度',
  clarity: '表达清晰度',
}

const REPORT_BG = '#0B1220'

/** 等待一帧让「展开逐题点评」等 DOM 变更完成布局 */
export function waitForLayout(): Promise<void> {
  return new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  )
}

export async function captureReportImage(
  node: HTMLElement,
  format: 'png' | 'jpeg',
): Promise<string> {
  const base = {
    backgroundColor: REPORT_BG,
    pixelRatio: 2,
    width: node.scrollWidth,
    height: node.scrollHeight,
    style: { maxHeight: 'none', overflow: 'visible' } as Partial<CSSStyleDeclaration>,
  }
  return format === 'png'
    ? toPng(node, base)
    : toJpeg(node, { ...base, quality: 0.92 })
}

export function downloadDataUrl(dataUrl: string, filename: string): void {
  const link = document.createElement('a')
  link.href = dataUrl
  link.download = filename
  link.click()
}

export function downloadText(text: string, filename: string, mime: string): void {
  const blob = new Blob([text], { type: mime })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export async function exportPdf(dataUrl: string, filename: string): Promise<void> {
  const img = new Image()
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = () => reject(new Error('image load failed'))
    img.src = dataUrl
  })
  const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' })
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const imgWidth = pageWidth
  const imgHeight = (img.height * imgWidth) / img.width
  let heightLeft = imgHeight
  let position = 0
  pdf.addImage(dataUrl, 'PNG', 0, position, imgWidth, imgHeight)
  heightLeft -= pageHeight
  while (heightLeft > 0) {
    position = heightLeft - imgHeight
    pdf.addPage()
    pdf.addImage(dataUrl, 'PNG', 0, position, imgWidth, imgHeight)
    heightLeft -= pageHeight
  }
  pdf.save(filename)
}

export function reportToMarkdown(session: Session): string {
  const report = session.report!
  const lines: string[] = []
  lines.push('# 答辩预演报告', '')
  lines.push(`- 答辩类型：${typeLabel(session.config)}`)
  lines.push(`- 学科：${disciplineLabel(session.config)}`)
  lines.push(`- 总分：${report.total} 分（${report.level}）`)
  lines.push(`- 生成时间：${new Date(report.createdAt).toLocaleString('zh-CN')}`)
  if (session.material.fileName) lines.push(`- 材料：${session.material.fileName}`)
  lines.push('')
  lines.push('## 总评', '', report.summary, '')
  lines.push('## 四维评分', '')
  for (const [key, value] of Object.entries(report.dimensions) as [
    keyof DimensionScores,
    number,
  ][]) {
    lines.push(`- ${DIMENSION_LABEL[key]}：${value} 分`)
  }
  lines.push('')
  lines.push('## 高危问题 Top 5', '')
  if (report.topRisks.length === 0) {
    lines.push('本场没有记录到高危问题。', '')
  } else {
    report.topRisks.forEach((risk, index) => {
      lines.push(`${index + 1}. **${risk.question}**`)
      lines.push(`   原因：${risk.reason}`)
    })
    lines.push('')
  }
  lines.push('## 逐题点评', '')
  report.questions.forEach((review, index) => {
    lines.push(`### 第 ${index + 1} 题 · ${review.question}（${review.score} 分）`, '')
    lines.push(`- 你的回答：${review.answer || '未作答'}`)
    lines.push(`- 点评：${review.comment}`)
    lines.push(`- 参考回答：${review.modelAnswer}`)
    lines.push('')
  })
  lines.push('## 复盘清单', '')
  report.checklist.forEach((item) => lines.push(`- ${item}`))
  lines.push('')
  return lines.join('\n')
}

export function reportToDocHtml(session: Session): string {
  const report = session.report!
  const escape = (text: string) =>
    text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const dimRows = (Object.entries(report.dimensions) as [keyof DimensionScores, number][])
    .map(([key, value]) => `<tr><td>${DIMENSION_LABEL[key]}</td><td>${value} 分</td></tr>`)
    .join('')
  const riskItems =
    report.topRisks.length === 0
      ? '<p>本场没有记录到高危问题。</p>'
      : report.topRisks
          .map(
            (risk, index) =>
              `<p><b>${index + 1}. ${escape(risk.question)}</b><br/>原因：${escape(
                risk.reason,
              )}</p>`,
          )
          .join('')
  const reviewItems = report.questions
    .map(
      (review, index) => `
    <div class="q">
      <h3>第 ${index + 1} 题 · ${escape(review.question)}（${review.score} 分）</h3>
      <p><b>你的回答：</b>${escape(review.answer || '未作答')}</p>
      <p><b>点评：</b>${escape(review.comment)}</p>
      <p><b>参考回答：</b>${escape(review.modelAnswer)}</p>
    </div>`,
    )
    .join('')
  const checklist = report.checklist
    .map((item) => `<li>${escape(item)}</li>`)
    .join('')
  return `<!doctype html><html><head><meta charset="utf-8"><title>答辩预演报告</title>
<style>
  body{font-family:"Microsoft YaHei","PingFang SC",Arial,sans-serif;color:#111;line-height:1.7;max-width:760px;margin:32px auto;padding:0 16px;}
  h1{font-size:26px;border-bottom:2px solid #b8862f;padding-bottom:8px;}
  h2{font-size:18px;color:#7a5a1c;margin-top:28px;border-left:4px solid #b8862f;padding-left:10px;}
  h3{font-size:15px;margin:16px 0 6px;}
  table{border-collapse:collapse;width:100%;}
  td,th{border:1px solid #ddd;padding:6px 10px;}
  .meta{color:#555;font-size:13px;}
  .q{border:1px solid #eee;border-radius:6px;padding:8px 14px;margin:10px 0;}
  ul{padding-left:20px;}
</style></head><body>
<h1>答辩预演报告</h1>
<p class="meta">
  答辩类型：${escape(typeLabel(session.config))} ｜ 学科：${escape(
    disciplineLabel(session.config),
  )} ｜ 总分：${report.total} 分（${report.level}）<br/>
  生成时间：${new Date(report.createdAt).toLocaleString('zh-CN')}${
    session.material.fileName ? ` ｜ 材料：${escape(session.material.fileName)}` : ''
  }
</p>
<h2>总评</h2><p>${escape(report.summary)}</p>
<h2>四维评分</h2><table>${dimRows}</table>
<h2>高危问题 Top 5</h2>${riskItems}
<h2>逐题点评</h2>${reviewItems}
<h2>复盘清单</h2><ul>${checklist}</ul>
</body></html>`
}
