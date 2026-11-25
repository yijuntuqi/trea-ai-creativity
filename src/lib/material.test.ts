import { normalizeMaterial } from './material'
import { hashText } from './hash'

it('keeps the whole material without truncating', () => {
  const body = '方法细节。'.repeat(1500)
  const text = `研究问题：A\n\n${body}\n\n结论：B`
  const out = normalizeMaterial(text)
  expect(out.startsWith('研究问题：A')).toBe(true)
  expect(out).toContain('结论：B')
  expect(out.length).toBeGreaterThan(4000)
})

it('normalizes line endings and blank lines', () => {
  expect(normalizeMaterial('a\r\n\r\n\r\n\r\nb')).toBe('a\n\nb')
})

it('hashes deterministically', async () => {
  const a = await hashText('材料')
  expect(a).toMatch(/^[0-9a-f]{16}$/)
  expect(await hashText('材料')).toBe(a)
  expect(await hashText('材料2')).not.toBe(a)
})
