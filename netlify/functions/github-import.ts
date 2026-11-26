import { composeRepoMaterial, parseRepoUrl, type RepoEntry } from '../../src/lib/github'

const CACHE_TTL = 60 * 60 * 1000
const README_MAX_CHARS = 60000
const FETCH_TIMEOUT = 9000
const USER_AGENT = 'defense-rehearsal-vip/1.0'

type ImportPayload = {
  text: string
  truncated: boolean
  repo: {
    slug: string
    description: string | null
    language: string | null
    stars: number
    fileCount: number
  }
}

const cache = new Map<string, { at: number; payload: ImportPayload }>()

const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': 'content-type, authorization',
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...CORS_HEADERS },
  })
}

function readEnv(value: string | undefined): string {
  return typeof value === 'string' ? value.trim() : ''
}

/** 用用户 JWT 调用 Supabase 的 is_vip()，失败一律按非 VIP 处理 */
async function verifyVip(token: string): Promise<boolean> {
  const url = readEnv(process.env.SUPABASE_URL) || readEnv(process.env.VITE_SUPABASE_URL)
  const key =
    readEnv(process.env.SUPABASE_ANON_KEY) || readEnv(process.env.VITE_SUPABASE_ANON_KEY)
  if (!url || !key) {
    console.error('[github-import] missing Supabase env, deny by default')
    return false
  }
  try {
    const response = await fetch(`${url.replace(/\/$/, '')}/rest/v1/rpc/is_vip`, {
      method: 'POST',
      headers: {
        apikey: key,
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      body: '{}',
      signal: AbortSignal.timeout(FETCH_TIMEOUT),
    })
    if (!response.ok) {
      console.error('[github-import] is_vip failed:', response.status)
      return false
    }
    return (await response.json()) === true
  } catch (error) {
    console.error('[github-import] is_vip threw:', String(error))
    return false
  }
}

function githubHeaders(accept: string): Record<string, string> {
  const headers: Record<string, string> = {
    accept,
    'user-agent': USER_AGENT,
    'x-github-api-version': '2022-11-28',
  }
  const token = readEnv(process.env.GITHUB_TOKEN)
  if (token) headers.authorization = `Bearer ${token}`
  return headers
}

function ghFetch(url: string, accept = 'application/vnd.github+json'): Promise<Response> {
  return fetch(url, { headers: githubHeaders(accept), signal: AbortSignal.timeout(FETCH_TIMEOUT) })
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }
  if (req.method !== 'POST') {
    return json(405, { message: '只支持 POST 请求' })
  }

  const authorization = req.headers.get('authorization') ?? ''
  const token = authorization.toLowerCase().startsWith('bearer ')
    ? authorization.slice(7).trim()
    : ''
  if (!token) {
    return json(401, { message: '请先登录账号再导入仓库。' })
  }
  if (!(await verifyVip(token))) {
    return json(403, { message: 'GitHub 仓库导入是 VIP 权益，升级后即可使用。' })
  }

  let body: { repoUrl?: unknown }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return json(400, { message: '请求格式不正确。' })
  }

  const ref = parseRepoUrl(typeof body.repoUrl === 'string' ? body.repoUrl : '')
  if (!ref) {
    return json(400, { message: '请输入公开仓库地址，例如 https://github.com/owner/repo' })
  }

  const cached = cache.get(ref.slug)
  if (cached && Date.now() - cached.at < CACHE_TTL) {
    return json(200, cached.payload)
  }

  const api = `https://api.github.com/repos/${ref.owner}/${ref.repo}`

  let meta: Response
  try {
    meta = await ghFetch(api)
  } catch {
    return json(502, { message: '连接 GitHub 失败，请稍后重试。' })
  }
  if (meta.status === 404) {
    return json(404, { message: '没有找到该仓库，请确认地址正确且为公开仓库。' })
  }
  if (meta.status === 403 || meta.status === 429) {
    return json(429, {
      message: 'GitHub 接口限流或仓库不可访问，请稍后重试（仅支持公开仓库）。',
    })
  }
  if (!meta.ok) {
    return json(502, { message: `GitHub 返回异常（${meta.status}），请稍后重试。` })
  }

  let info: {
    description?: string | null
    language?: string | null
    stargazers_count?: number
    private?: boolean
  }
  try {
    info = (await meta.json()) as typeof info
  } catch {
    return json(502, { message: 'GitHub 返回内容无法解析，请稍后重试。' })
  }
  if (info.private) {
    return json(403, { message: '仅支持公开仓库，私有仓库无法导入。' })
  }

  let readme = ''
  try {
    const readmeResponse = await ghFetch(`${api}/readme`, 'application/vnd.github.raw+json')
    if (readmeResponse.ok) {
      readme = (await readmeResponse.text()).slice(0, README_MAX_CHARS)
    }
  } catch {
    // README 抓取失败不阻断，仍返回目录
  }

  let entries: RepoEntry[] = []
  try {
    const contentsResponse = await ghFetch(`${api}/contents`)
    if (contentsResponse.ok) {
      const list = (await contentsResponse.json()) as Array<{
        name?: string
        type?: string
        size?: number
      }>
      entries = list
        .filter((item) => typeof item.name === 'string' && (item.type === 'file' || item.type === 'dir'))
        .slice(0, 200)
        .map((item) => ({
          name: item.name as string,
          type: item.type === 'dir' ? ('dir' as const) : ('file' as const),
          size: typeof item.size === 'number' ? item.size : null,
        }))
    }
  } catch {
    // 目录抓取失败不阻断，仅返回 README
  }

  const { text, truncated } = composeRepoMaterial(
    {
      owner: ref.owner,
      repo: ref.repo,
      description: info.description ?? null,
      language: info.language ?? null,
      stars: typeof info.stargazers_count === 'number' ? info.stargazers_count : null,
    },
    readme,
    entries,
  )

  const payload: ImportPayload = {
    text,
    truncated,
    repo: {
      slug: ref.slug,
      description: info.description ?? null,
      language: info.language ?? null,
      stars: typeof info.stargazers_count === 'number' ? info.stargazers_count : 0,
      fileCount: entries.length,
    },
  }

  if (cache.size > 200) cache.clear()
  cache.set(ref.slug, { at: Date.now(), payload })

  return json(200, payload)
}
