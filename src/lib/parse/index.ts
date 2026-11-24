import { extractPdfText } from './pdf'
import { extractPptxText } from './pptx'
import { ParseError } from './errors'

export { ParseError }
export type { ParseErrorCode } from './errors'

export async function parseFile(file: File): Promise<{ text: string; warning?: string }> {
  const name = file.name.toLowerCase()

  try {
    if (name.endsWith('.pdf')) {
      return { text: await extractPdfText(await file.arrayBuffer()) }
    }
    if (name.endsWith('.pptx')) {
      return { text: await extractPptxText(await file.arrayBuffer()) }
    }
    if (name.endsWith('.txt')) {
      return { text: (await file.text()).trim() }
    }
    throw new ParseError('unsupported', '暂不支持该格式，请粘贴文本')
  } catch (error) {
    if (error instanceof ParseError) throw error
    throw new ParseError('corrupt', '文件解析失败，请粘贴文本')
  }
}
