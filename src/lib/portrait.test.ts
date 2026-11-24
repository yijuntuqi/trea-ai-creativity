import { expect, it, vi } from 'vitest'
import { generatePortrait, genericPortrait } from './portrait'

const { runTaskMock } = vi.hoisted(() => ({ runTaskMock: vi.fn() }))
vi.mock('./llm', () => ({ runTask: runTaskMock }))

const config = { type: 'master', discipline: 'stem', strictness: 'standard', minutes: 15 } as const

it('falls back to generic portrait', () => {
  const portrait = genericPortrait('研究问题：如何提升答辩表现\n方法：访谈与实验\n结论：有效')
  expect(portrait.topic).toContain('如何提升答辩表现')
  expect(portrait.innovation.length).toBeGreaterThan(0)
  expect(portrait.limitations.length).toBeGreaterThan(0)
})

it('returns generic portrait after two invalid model outputs', async () => {
  runTaskMock.mockResolvedValue({ text: '不是 JSON', source: 'live' })

  const result = await generatePortrait(
    { text: '研究问题：如何提升答辩表现\n方法：访谈与实验\n结论：有效', chars: 27, hash: 'h' },
    config,
  )

  expect(result.source).toBe('mock')
  expect(result.portrait.topic).toContain('如何提升答辩表现')
  expect(runTaskMock).toHaveBeenCalledTimes(2)
})

it('normalizes partial model output', async () => {
  runTaskMock.mockResolvedValue({
    text: '```json\n{"topic":"某主题","innovation":["创新"],"keywords":["词"]}\n```',
    source: 'live',
  })

  const result = await generatePortrait({ text: '材料', chars: 2, hash: 'h' }, config)

  expect(result.source).toBe('live')
  expect(result.portrait.topic).toBe('某主题')
  expect(result.portrait.innovation).toEqual(['创新'])
  expect(result.portrait.method.length).toBeGreaterThan(0)
  expect(result.portrait.limitations.length).toBeGreaterThan(0)
})
