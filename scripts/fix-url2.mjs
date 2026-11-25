// 用正确的 Netlify API endpoint 强制覆盖 MAAS_BASE_URL 的 production 值
import fs from 'node:fs'
import path from 'node:path'
import { homedir } from 'node:os'

const envFile = path.resolve('.env')
const lines = fs.readFileSync(envFile, 'utf8').split('\n')
const url = (lines.find(l => l.startsWith('MAAS_BASE_URL=')) || '').slice('MAAS_BASE_URL='.length).trim()

const cfg = JSON.parse(fs.readFileSync(path.join(homedir(), 'AppData', 'Roaming', 'netlify', 'Config', 'config.json'), 'utf8'))
const token = Object.values(cfg.users || {})[0]?.auth?.token
const siteId = 'f90c0dfe-0e60-425e-aaea-c654974015b9'
const auth = { Accept: 'application/json', Authorization: `Bearer ${token}` }

// 1. 完整列出所有 env vars 的原始结构
const list = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/env`, { headers: auth }).then(r => r.json())
const urlVar = list.find(v => v.key === 'MAAS_BASE_URL')
console.log('MAAS_BASE_URL raw structure:')
console.log(JSON.stringify(urlVar, null, 2))

// 2. 尝试不同 endpoint 来 update
const productionVal = urlVar.values.find(v => v.context === 'production')
console.log(`\nTarget production value id: ${productionVal?.id}`)
console.log(`New value: ${url}`)

const endpoints = [
  `/api/v1/sites/${siteId}/env/values/${productionVal.id}`,
  `/api/v1/sites/${siteId}/env/${productionVal.id}`,
  `/api/v1/sites/${siteId}/env/bulk`,
]

for (const ep of endpoints.slice(0, 2)) {
  const r = await fetch(`https://api.netlify.com${ep}`, {
    method: 'PUT', headers: { ...auth, 'content-type': 'application/json' },
    body: JSON.stringify({ value: url, context: 'production' }),
  })
  const body = await r.text()
  console.log(`PUT ${ep}: ${r.status} ${body.slice(0, 200)}`)
}

// 3. DELETE 旧 key + POST 新 key 的 all-contexts bulk
console.log('\n--- Try delete old var then post new ---')
for (const v of list) {
  if (v.key === 'MAAS_BASE_URL') {
    const del = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/env/${v.values[0].id}`, {
      method: 'DELETE', headers: auth,
    })
    console.log(`DELETE ${v.values[0].id}: ${del.status} ${await del.text()}`)
  }
}

// 4. POST bulk 新值
const bulkBody = ['production', 'deploy-preview', 'branch-deploy', 'dev-server'].map(ctx => ({
  key: 'MAAS_BASE_URL', value: url, context: ctx,
}))
const newR = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/env/bulk`, {
  method: 'POST', headers: { ...auth, 'content-type': 'application/json' },
  body: JSON.stringify(bulkBody),
})
console.log(`POST bulk: ${newR.status} ${(await newR.text()).slice(0, 300)}`)
