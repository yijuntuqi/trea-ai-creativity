import { buildPrompt, type LLMTask } from '../../src/lib/prompts'

const TASKS: LLMTask[] = ['portrait', 'question', 'evaluate', 'hint', 'report']

// 允许整篇论文/实验数据原样进入模型，不做截断
const MAX_PAYLOAD_CHARS = 300000
const DAILY_LIMIT = 1000

let dayKey = ''
let callCount = 0

function overDailyLimit(): boolean {
  const today = new Date().toISOString().slice(0, 10)
  if (today !== dayKey) {
    dayKey = today
    callCount = 0
  }
  callCount += 1
  return callCount > DAILY_LIMIT
}

const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': 'content-type',
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...CORS_HEADERS },
  })
}

function sseFrame(payload: unknown): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(payload)}\n\n`)
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }
  if (req.method !== 'POST') {
    return json(405, { error: { code: 'METHOD_NOT_ALLOWED' } })
  }
  if (overDailyLimit()) {
    return json(429, { error: { code: 'RATE_LIMITED' } })
  }

  let body: { task?: string; payload?: Record<string, unknown> }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return json(400, { error: { code: 'BAD_JSON' } })
  }

  const task = body.task as LLMTask
  if (!TASKS.includes(task)) {
    return json(400, { error: { code: 'UNKNOWN_TASK' } })
  }

  const payload = body.payload ?? {}
  if (JSON.stringify(payload).length > MAX_PAYLOAD_CHARS) {
    return json(413, { error: { code: 'PAYLOAD_TOO_LARGE' } })
  }

  const apiKey = process.env.MAAS_API_KEY
  if (!apiKey) {
    return json(500, { error: { code: 'NO_KEY' } })
  }
  if (apiKey.includes('secrets') || apiKey.includes('Netlify') || apiKey.includes('build is failing')) {
    console.error('[llm] MAAS_API_KEY looks like a leaked scan message, refusing to call upstream')
    return json(500, { error: { code: 'BAD_KEY', detail: 'env var corrupted by secrets scan' } })
  }

  // 从 env 取 baseUrl；若被 Secrets Scan 污染则自动 fallback 到硬编码值
  const FALLBACK_URL = 'https://ws-4hkjkfltx0ydu89i.cn-beijing.maas.aliyuncs.com/compatible-mode/v1'
  let baseUrl = process.env.MAAS_BASE_URL?.trim() || FALLBACK_URL
  if (/secrets|Netlify|build is failing/i.test(baseUrl)) {
    console.warn('[llm] MAAS_BASE_URL corrupted by secrets scan, using fallback URL')
    baseUrl = FALLBACK_URL
  }
  console.log(`[llm] baseUrl=${baseUrl.slice(0, 40)}... apiKey_len=${apiKey.length}`)

  const prompt = buildPrompt(task, payload)

  let upstream: Response
  try {
    upstream = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: prompt.model,
        messages: [
          { role: 'system', content: prompt.system },
          { role: 'user', content: prompt.user },
        ],
        max_tokens: prompt.maxTokens,
        temperature: prompt.temperature,
        stream: true,
        // 关闭思考模式：qwen3 思考模式单次可达 40s+，会触发 Netlify 30s 空闲超时
        enable_thinking: false,
      }),
    })
  } catch (e) {
    const detail = e instanceof Error ? `${e.name}: ${e.message}${e.cause ? ' cause=' + e.cause : ''}` : String(e)
    console.error('[llm] upstream fetch threw:', detail)
    return json(502, { error: { code: 'UPSTREAM_FAILED', detail } })
  }

  if (!upstream.ok) {
    const text = await upstream.text().catch(() => '')
    console.error('[llm] upstream non-ok:', upstream.status, text.slice(0, 500))
    return json(502, {
      error: { code: 'UPSTREAM_FAILED', status: upstream.status, body: text.slice(0, 500) },
    })
  }

  if (!upstream.body) {
    return json(502, { error: { code: 'UPSTREAM_FAILED', detail: 'empty body' } })
  }

  const upstreamBody = upstream.body
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = upstreamBody.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      try {
        while (true) {
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
                controller.enqueue(sseFrame({ done: true }))
                controller.close()
                return
              }
              if (data) {
                try {
                  const parsed = JSON.parse(data) as {
                    choices?: Array<{ delta?: { content?: string } }>
                  }
                  const delta = parsed.choices?.[0]?.delta?.content
                  if (delta) controller.enqueue(sseFrame({ delta }))
                } catch {
                  // 忽略无法解析的上游帧
                }
              }
            }

            index = buffer.indexOf('\n')
          }
        }

        controller.enqueue(sseFrame({ done: true }))
        controller.close()
      } catch {
        controller.error(new Error('STREAM_FAILED'))
      }
    },
  })

  return new Response(stream, {
    status: 200,
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache',
      connection: 'keep-alive',
      ...CORS_HEADERS,
    },
  })
}
