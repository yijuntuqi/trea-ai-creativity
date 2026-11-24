import { truncateMaterial } from './truncate'
import { hashText } from './hash'

it('keeps head and conclusion within limit', () => {
  const text = '研究问题：A\n\n' + '方法细节。'.repeat(1500) + '\n\n结论：B'
  const out = truncateMaterial(text, 4000)
  expect(out.startsWith('研究问题：A')).toBe(true)
  expect(out).toContain('结论：B')
  expect(out.length).toBeLessThanOrEqual(4000)
})

it('returns short text unchanged', () => {
  expect(truncateMaterial('短文本')).toBe('短文本')
})

it('hashes deterministically', async () => {
  const a = await hashText('材料')
  expect(a).toMatch(/^[0-9a-f]{16}$/)
  expect(await hashText('材料')).toBe(a)
  expect(await hashText('材料2')).not.toBe(a)
})
