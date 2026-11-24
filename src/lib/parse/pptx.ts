import JSZip from 'jszip'
import { ParseError } from './errors'

const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&apos;': "'",
}

function decodeEntities(text: string): string {
  return text.replace(/&(amp|lt|gt|quot|apos);/g, (match) => ENTITIES[match] ?? match)
}

export async function extractPptxText(buffer: ArrayBuffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer)

  const slides = Object.keys(zip.files)
    .map((name) => ({ name, match: /^ppt\/slides\/slide(\d+)\.xml$/.exec(name) }))
    .filter((entry) => entry.match)
    .map((entry) => ({ name: entry.name, order: Number(entry.match![1]) }))
    .sort((a, b) => a.order - b.order)

  const pages: string[] = []

  for (const slide of slides) {
    const xml = await zip.files[slide.name].async('string')
    const texts: string[] = []
    const pattern = /<a:t[^>]*>([\s\S]*?)<\/a:t>/g
    let match: RegExpExecArray | null

    while ((match = pattern.exec(xml)) !== null) {
      const line = decodeEntities(match[1]).trim()
      if (line) texts.push(line)
    }

    if (texts.length > 0) pages.push(texts.join('\n'))
  }

  const text = pages.join('\n\n').trim()
  if (!text) throw new ParseError('no-text', '未识别到文本')
  return text
}
