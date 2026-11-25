// 触发新部署并轮询到 Published
import fs from 'node:fs'
import path from 'node:path'
import { homedir } from 'node:os'

const cfg = JSON.parse(fs.readFileSync(path.join(homedir(), 'AppData', 'Roaming', 'netlify', 'Config', 'config.json'), 'utf8'))
const token = Object.values(cfg.users || {})[0]?.auth?.token
const siteId = 'f90c0dfe-0e60-425e-aaea-c654974015b9'
const auth = { Accept: 'application/json', Authorization: `Bearer ${token}` }

// 触发部署
const trigger = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/deploys`, {
  method: 'POST', headers: { ...auth, 'content-type': 'application/json' },
  body: JSON.stringify({ draft: false, clear_cache: false }),
})
const deploy = await trigger.json()
console.log(`Deploy triggered: id=${deploy.id?.slice?.(0, 10)} status=${deploy.status}`)

// 轮询状态，等构建完成
const maxWait = 300 // 5 分钟
const start = Date.now()
let status = deploy.status || 'building'
while (Date.now() - start < maxWait * 1000) {
  await new Promise(r => setTimeout(r, 10000))
  const poll = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/deploys/${deploy.id}`, { headers: auth })
  const d = await poll.json()
  status = d.status
  const elapsed = Math.round((Date.now() - start) / 1000)
  console.log(`  [${elapsed}s] status=${status}${d.error_message ? ' err=' + d.error_message.slice(0, 80) : ''}`)
  if (status === 'published') break
  if (status === 'failed' || status === 'error' || status === 'canceled') break
}
console.log(`FINAL: status=${status} url=${deploy.url}`)
