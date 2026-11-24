import type { LLMTask } from './prompts'
import { mockTask } from './mock'

export type LLMRequest = {
  task: LLMTask
  payload: Record<string, unknown>
  sessionId: string
}

export type Usage = { prompt: number; completion: number }

export type RunResult = { text: string; source: 'live' | 'mock'; usage?: Usage }

type Frame = { delta?: string; done?: boolean }

async function readStream(
  body: ReadableStream<Uint8Array>,
  onDelta: (text: string) => void,
): Promise<string> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let text = ''
  let finished = false

  while (!finished) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    let index = buffer.indexOf('\n')
    while (index >= 0) {
      const line = buffer.slice(0, index).trim()
      buffer = buffer.slice(index + 1)
      if (line.startsWith('data:')) {
        const data = line.slice(5).trim()
        if (data === '[DONE]') {
          finished = true
          break
        }
        if (data) {
          const frame = JSON.parse(data) as Frame
          if (typeof frame.delta === 'string' && frame.delta) {
            text += frame.delta
            onDelta(frame.delta)
          }
          if (frame.done) {
            finished = true
            break
          }
        }
      }
      index = buffer.indexOf('\n')
    }
  }

  return text
}

export async function runTask(
  req: LLMRequest,
  onDelta: (text: string) => void,
  opts: { signal?: AbortSignal } = {},
): Promise<RunResult> {
  if (import.meta.env.VITE_DEMO_MODE === '1') {
    const text = mockTask(req.task, req.payload)
    onDelta(text)
    return { text, source: 'mock' }
  }

  try {
    const response = await fetch('/api/llm', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(req),
      signal: opts.signal,
    })
    if (!response.ok || !response.body) throw new Error(`HTTP_${response.status}`)

    const text = await readStream(response.body, onDelta)
    if (!text) throw new Error('EMPTY_RESPONSE')
    return { text, source: 'live' }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw error
    const text = mockTask(req.task, req.payload)
    onDelta(text)
    return { text, source: 'mock' }
  }
}
