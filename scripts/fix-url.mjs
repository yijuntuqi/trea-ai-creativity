// 查看并修复 MAAS_BASE_URL（只覆盖 production context）
import fs from 'node:fs'
import path from 'node:path'
import { homedir } from 'node:os'

const envFile = path.resolve('.env')
const lines = fs.readFileSync(envFile, 'utf8').split('\n')
const url = (lines.find(l => l.startsWith('MAAS_BASE_URL=')) || '').slice('MAAS_BASE_URL='.length).trim()

const configPath = path.join(homedir(), 'AppData', 'Roaming', 'netlify', 'Config', 'config.json')
const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'))
const token = Object.values(cfg.users || {})[0]?.auth?.token
const siteId = 'f90c0dfe-0e60-425e-aaea-c654974015b9'

const auth = { Accept: 'application/json', Authorization: `Bearer ${token}` }

const listRes = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/env`, { headers: auth })
const listData = await listRes.json()

const urlVar = listData.find(v => v.key === 'MAAS_BASE_URL')
console.log('MAAS_BASE_URL current values:')
for (const v of urlVar?.values || []) {
  // 不回显完整值，只打长度和前30字符
  const vv = v.value || ''
  console.log(`  ${v.context}: id=${v.id} len=${vv.length} value=${vv.slice(0, 50)}...`)
}
console.log(`Target URL: ${url.slice(0, 50)}...`)

// 逐个覆盖每个 context 的值
if (urlVar) {
  for (const val of urlVar.values) {
    const r = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/env/values/${val.id}`, {
      method: 'PUT',
      headers: { ...auth, 'content-type': 'application/json' },
      body: JSON.stringify({ value: url }),
    })
    const body = await r.text()
    console.log(`  PUT ${val.context}: ${r.status} ${body.slice(0, 100)}`)
  }
}

// 触发部署
console.log('--- triggering deploy ---')
const dr = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/deploys`, {
  method: 'POST', headers: { ...auth, 'content-type': 'application/json' },
  body: JSON.stringify({ draft: false, clear_cache: false }),
})
const d = await dr.json()
console.log(`DEPLOY ${dr.status} id=${d.id?.slice?.(0, 8)}`)
