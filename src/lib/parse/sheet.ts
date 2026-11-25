import { ParseError } from './errors'

export async function extractSheetText(buffer: ArrayBuffer): Promise<string> {
  const XLSX = await import('xlsx')
  const workbook = XLSX.read(buffer, { type: 'array' })

  const pages = workbook.SheetNames.map((name) => {
    const sheet = workbook.Sheets[name]
    if (!sheet) return ''
    const csv = XLSX.utils.sheet_to_csv(sheet, { blankrows: false }).trim()
    return csv ? `【工作表：${name}】\n${csv}` : ''
  }).filter(Boolean)

  const text = pages.join('\n\n').trim()
  if (!text) throw new ParseError('no-text', '未在表格中识别到数据')
  return text
}
