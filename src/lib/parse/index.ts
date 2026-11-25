import { extractPdfText } from './pdf'
import { extractPptxText } from './pptx'
import { extractDocxText } from './docx'
import { extractSheetText } from './sheet'
import { ParseError } from './errors'

export { ParseError }
export type { ParseErrorCode } from './errors'

const TEXT_EXTENSIONS = ['.txt', '.md', '.markdown', '.json', '.csv', '.tsv', '.log', '.yaml', '.yml']

export const ACCEPT_EXTENSIONS = [
  '.pdf',
  '.pptx',
  '.docx',
  '.xlsx',
  '.xls',
  ...TEXT_EXTENSIONS,
]

export async function parseFile(file: File): Promise<{ text: string }> {
  const name = file.name.toLowerCase()

  try {
    if (name.endsWith('.pdf')) {
      return { text: await extractPdfText(await file.arrayBuffer()) }
    }
    if (name.endsWith('.pptx')) {
      return { text: await extractPptxText(await file.arrayBuffer()) }
    }
    if (name.endsWith('.docx')) {
      return { text: await extractDocxText(await file.arrayBuffer()) }
    }
    if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
      return { text: await extractSheetText(await file.arrayBuffer()) }
    }
    if (TEXT_EXTENSIONS.some((extension) => name.endsWith(extension))) {
      const text = (await file.text()).trim()
      if (!text) throw new ParseError('no-text', '文件内容为空')
      return { text }
    }
    throw new ParseError('unsupported', '暂不支持该格式')
  } catch (error) {
    if (error instanceof ParseError) throw error
    throw new ParseError('corrupt', '文件解析失败')
  }
}
