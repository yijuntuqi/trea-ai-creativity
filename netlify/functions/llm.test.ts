import { afterEach, expect, it, vi } from 'vitest'
import handler from './llm'

function post(body: unknown): Request {
  return new Request('http://localhost/api/llm', { method: 'POST', body: JSON.stringify(body) })
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

it('rejects unknown task', async () => {
  const res = await handler(post({ task: 'x', payload: {}, sessionId: 's' }))
  expect(res.status).toBe(400)
})

it('rejects oversized payload', async () => {
  const payload = { text: 'x'.repeat(20000) }
  const res = await handler(post({ task: 'portrait', payload, sessionId: 's' }))
  expect(res.status).toBe(413)
})

it('returns 500 without key', async () => {
  vi.stubEnv('MAAS_API_KEY', '')
  const res = await handler(post({ task: 'question', payload: {}, sessionId: 's' }))
  expect(res.status).toBe(500)
  expect(await res.text()).toContain('NO_KEY')
})

it('streams deltas', async () => {
  vi.stubEnv('MAAS_API_KEY', 'test-key')
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(
              new TextEncoder().encode(
                'data: {"choices":[{"delta":{"content":"你好"}}]}\n\ndata: [DONE]\n\n',
              ),
            )
            controller.close()
          },
        }),
        { status: 200 },
      ),
    ),
  )

  const res = await handler(post({ task: 'question', payload: {}, sessionId: 's' }))
  expect(res.headers.get('content-type')).toContain('text/event-stream')
  expect(await res.text()).toContain('"delta":"你好"')
})
