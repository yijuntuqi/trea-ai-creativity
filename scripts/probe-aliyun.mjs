// 从 .env 读取 Key 直连阿里云 MaaS，验证 Key 是否有效
import fs from 'node:fs'
import path from 'node:path'

const envFile = path.resolve('.env')
const lines = fs.readFileSync(envFile, 'utf8').split('\n')
const get = (k) => lines.find(l => l.startsWith(k + '='))?.slice(k.length + 1)?.trim()

const apiKey = get('MAAS_API_KEY')
const baseUrl = get('MAAS_BASE_URL')

if (!apiKey || !baseUrl) {
  console.log('Missing MAAS_API_KEY or MAAS_BASE_URL in .env')
  process.exit(1)
}

console.log(`Base URL: ${baseUrl}`)
console.log(`Key length: ${apiKey.length}, starts with: ${apiKey.slice(0, 5)}...`)

const body = JSON.stringify({
  model: 'qwen3.8-flash',
  messages: [
    { role: 'system', content: 'You are a terse assistant. Reply in 15 Chinese chars max.' },
    { role: 'user', content: '一句话介绍自己' },
  ],
  max_tokens: 64,
  temperature: 0.7,
})

try {
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body,
  })
  console.log(`HTTP ${res.status} ${res.statusText}`)
  const text = await res.text()
  console.log(text.slice(0, 600))
} catch (e) {
  console.error(`FETCH_FAILED: ${e.name}: ${e.message}`)
}
