import JSZip from 'jszip'
import { ParseError } from './errors'

const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&apos;': "'",
  '&nbsp;': ' ',
}

function decodeEntities(text: string): string {
  return text
    .replace(/&(amp|lt|gt|quot|apos|nbsp);/g, (match) => ENTITIES[match] ?? match)
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number.parseInt(dec, 10)))
}

export async function extractDocxText(buffer: ArrayBuffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer)
  const file = zip.file('word/document.xml')
  if (!file) throw new ParseError('corrupt', '无法读取 Word 文档结构')

  const xml = await file.async('string')
  const withBreaks = xml
    .replace(/<w:tab[^>]*\/>/g, '\t')
    .replace(/<w:br[^>]*\/>/g, '\n')
    .replace(/<\/w:p>/g, '\n')

  const text = decodeEntities(withBreaks.replace(/<[^>]+>/g, ''))
    .split('\n')
    .map((line) => line.replace(/[ \u00a0]+/g, ' ').trim())
    .filter(Boolean)
    .join('\n')
    .trim()

  if (!text) throw new ParseError('no-text', '未在 Word 文档中识别到文本')
  return text
}
