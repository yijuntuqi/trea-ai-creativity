// 读 Netlify config → 取 token → 直接调 REST API 设置 env vars → 触发部署
import fs from 'node:fs'
import path from 'node:path'
import { homedir } from 'node:os'

const envFile = path.resolve('.env')
const lines = fs.readFileSync(envFile, 'utf8').split('\n')
const getEnv = (k) => lines.find(l => l.startsWith(k + '='))?.slice(k.length + 1)?.trim()

const apiKey = getEnv('MAAS_API_KEY')
const baseUrl = getEnv('MAAS_BASE_URL')

const configPath = path.join(homedir(), 'AppData', 'Roaming', 'netlify', 'Config', 'config.json')
const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'))
const token = Object.values(cfg.users || {})[0]?.auth?.token
const siteId = cfg.current_site || 'f90c0dfe-0e60-425e-aaea-c654974015b9'
const accountId = cfg.users ? Object.keys(cfg.users)[0] : null

console.log(`siteId=${siteId} accountId=${accountId} token_len=${token?.length}`)
console.log(`key_len=${apiKey?.length} url=${baseUrl}`)

const auth = { Accept: 'application/json', Authorization: `Bearer ${token}` }

// 1. 先拿当前 env vars（找出 context_id 需要保留）
const listRes = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/env`, { headers: auth })
if (!listRes.ok) {
  console.error('LIST_FAIL', listRes.status, await listRes.text())
  process.exit(1)
}
const current = await listRes.json()
console.log(`current env vars: ${current.length}`)

// 2. 准备要设置的两个 var
// 先删旧的
for (const v of current) {
  if (v.key === 'MAAS_API_KEY' || v.key === 'MAAS_BASE_URL') {
    const r = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/env/${v.id}`, {
      method: 'DELETE', headers: auth,
    })
    console.log(`DELETE ${v.key}: ${r.status}`)
  }
}

// 3. 发新的（全部 contexts 都覆盖）
for (const [key, value] of [['MAAS_BASE_URL', baseUrl], ['MAAS_API_KEY', apiKey]]) {
  const contexts = ['production', 'deploy-preview', 'branch-deploy', 'dev']
  const payload = contexts.map(ctx => ({ key, value, context: ctx }))
  const r = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/env/bulk`, {
    method: 'POST',
    headers: { ...auth, 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const body = await r.text()
  console.log(`BULK_SET ${key}: ${r.status} ${body.slice(0, 200)}`)
}

// 4. 触发部署
const deployRes = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/deploys`, {
  method: 'POST',
  headers: { ...auth, 'content-type': 'application/json' },
  body: JSON.stringify({ draft: false, clear_cache: false }),
})
const deploy = await deployRes.json()
console.log(`DEPLOY status=${deployRes.status} id=${deploy.id?.slice?.(0, 8)} url=${deploy.url}`)

// 5. 新 env vars 应该在构建完成后生效，但函数立即用的话需要等待部署
console.log('--- done ---')
