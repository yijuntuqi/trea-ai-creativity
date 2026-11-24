import { afterEach, expect, it, vi } from 'vitest'
import { runTask } from './llm'

afterEach(() => {
  vi.unstubAllGlobals()
})

it('streams live deltas', async () => {
  const frames = [
    'data: {"delta":"你"}\n\n',
    'data: {"delta":"好"}\n\n',
    'data: {"done":true}\n\n',
  ]
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response(
        new ReadableStream({
          start(controller) {
            const encoder = new TextEncoder()
            frames.forEach((frame) => controller.enqueue(encoder.encode(frame)))
            controller.close()
          },
        }),
        { status: 200 },
      ),
    ),
  )

  const seen: string[] = []
  const result = await runTask({ task: 'hint', payload: {}, sessionId: 's' }, (delta) =>
    seen.push(delta),
  )

  expect(seen).toEqual(['你', '好'])
  expect(result.text).toBe('你好')
  expect(result.source).toBe('live')
})

it('falls back to mock on network failure', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))

  const seen: string[] = []
  const result = await runTask({ task: 'portrait', payload: {}, sessionId: 's' }, (delta) =>
    seen.push(delta),
  )

  expect(result.source).toBe('mock')
  expect(result.text.length).toBeGreaterThan(0)
  expect(seen.join('')).toBe(result.text)
})
