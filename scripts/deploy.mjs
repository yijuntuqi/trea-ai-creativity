// 触发部署（简短版）
import fs from 'node:fs'
import path from 'node:path'
import { homedir } from 'node:os'
const cfg = JSON.parse(fs.readFileSync(path.join(homedir(), 'AppData', 'Roaming', 'netlify', 'Config', 'config.json'), 'utf8'))
const token = Object.values(cfg.users || {})[0]?.auth?.token
const siteId = 'f90c0dfe-0e60-425e-aaea-c654974015b9'
const auth = { Accept: 'application/json', Authorization: `Bearer ${token}` }
const r = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/deploys`, {
  method: 'POST', headers: { ...auth, 'content-type': 'application/json' },
  body: JSON.stringify({ draft: false }),
})
const d = await r.json()
console.log(`DEPLOY ${r.status} id=${d.id?.slice?.(0,10)}`)
