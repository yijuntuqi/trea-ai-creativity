// 调试 Netlify env vars API
import fs from 'node:fs'
import path from 'node:path'
import { homedir } from 'node:os'

const configPath = path.join(homedir(), 'AppData', 'Roaming', 'netlify', 'Config', 'config.json')
const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'))
const token = Object.values(cfg.users || {})[0]?.auth?.token
const siteId = 'f90c0dfe-0e60-425e-aaea-c654974015b9'
const accountId = cfg.userId

const auth = { Accept: 'application/json', Authorization: `Bearer ${token}` }

// 1. List site env
const listRes = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/env`, { headers: auth })
const listData = await listRes.json()
console.log('SITE ENV list status:', listRes.status)
console.log(JSON.stringify(listData, null, 2))

// 2. Try account-level env API (with account_id)
const accRes = await fetch(`https://api.netlify.com/api/v1/accounts/${accountId}/env`, { headers: auth })
console.log('\nACCOUNT ENV list status:', accRes.status)
const accData = await accRes.json()
console.log(JSON.stringify(accData, null, 2))

// 3. Try listing via contexts
const ctxRes = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/env/contexts`, { headers: auth })
console.log('\nCONTEXTS status:', ctxRes.status, await ctxRes.text())
