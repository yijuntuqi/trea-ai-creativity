const KEY_PATTERN = /方法|实验|结果|结论|讨论|method|result|conclusion/i

export function truncateMaterial(text: string, maxChars = 4000): string {
  const normalized = text
    .replace(/\r\n?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  if (normalized.length <= maxChars) return normalized

  const paragraphs = normalized
    .split('\n\n')
    .map((p) => p.trim())
    .filter(Boolean)

  const head = paragraphs[0] ?? ''
  const tail = paragraphs.length > 1 ? paragraphs[paragraphs.length - 1] : ''
  const middle = paragraphs.slice(1, Math.max(1, paragraphs.length - 1))

  let budget = maxChars - head.length - (tail ? tail.length + 2 : 0)
  const picked: string[] = []

  for (const p of middle) {
    if (budget <= 2) break
    if (!KEY_PATTERN.test(p)) continue
    if (p.length + 2 <= budget) {
      picked.push(p)
      budget -= p.length + 2
    } else {
      picked.push(p.slice(0, Math.max(0, budget - 2)))
      budget = 0
      break
    }
  }

  const result = [head, ...picked, tail].filter(Boolean).join('\n\n')
  return result.length <= maxChars ? result : result.slice(0, maxChars)
}
