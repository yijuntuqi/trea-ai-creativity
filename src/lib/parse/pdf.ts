import pdfjs from './pdfjs'
import { ParseError } from './errors'

export async function extractPdfText(buffer: ArrayBuffer): Promise<string> {
  const doc = await pdfjs.getDocument({ data: buffer }).promise

  const pages: string[] = []
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const content = await page.getTextContent()
    const text = content.items.map((item) => ('str' in item ? item.str : '')).join('')
    pages.push(text)
  }

  const text = pages.join('\n').trim()
  if (text.length < 20) throw new ParseError('no-text', '未识别到文本，请粘贴大纲')
  return text
}
