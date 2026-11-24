export function parseLooseJSON<T>(raw: string): T {
  let text = raw.trim()
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenced) text = fenced[1].trim()

  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start >= 0 && end > start) text = text.slice(start, end + 1)

  try {
    return JSON.parse(text) as T
  } catch {
    // 继续尝试修复尾逗号
  }

  try {
    return JSON.parse(text.replace(/,\s*([}\]])/g, '$1')) as T
  } catch {
    throw new Error('JSON_PARSE_FAILED')
  }
}
