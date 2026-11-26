export const GITHUB_MATERIAL_LIMIT = 20000

const NAME_PATTERN = /^[A-Za-z0-9._-]{1,100}$/

export type RepoRef = { owner: string; repo: string; slug: string }

export type RepoSummary = {
  owner: string
  repo: string
  description?: string | null
  language?: string | null
  stars?: number | null
}

export type RepoEntry = {
  name: string
  type: 'file' | 'dir'
  size?: number | null
}

/** 只接受 github.com/{owner}/{repo}，可带 .git 后缀与末尾斜杠 */
export function parseRepoUrl(raw: string): RepoRef | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  let value = trimmed
  if (!/^https?:\/\//i.test(value)) {
    if (!/^(www\.)?github\.com\//i.test(value)) return null
    value = `https://${value}`
  }

  let url: URL
  try {
    url = new URL(value)
  } catch {
    return null
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
  if (!/^(www\.)?github\.com$/i.test(url.hostname)) return null

  const parts = url.pathname.split('/').filter(Boolean)
  if (parts.length !== 2) return null

  const owner = parts[0]
  const repo = parts[1].replace(/\.git$/i, '')
  if (!NAME_PATTERN.test(owner) || !NAME_PATTERN.test(repo)) return null

  return { owner, repo, slug: `${owner}/${repo}` }
}

function entryLine(entry: RepoEntry): string {
  if (entry.type === 'dir') return `- ${entry.name}/（目录）`
  const size = typeof entry.size === 'number' && entry.size > 0 ? ` （${formatSize(entry.size)}）` : ''
  return `- ${entry.name}${size}`
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
  if (bytes >= 1024) return `${Math.round(bytes / 1024)}KB`
  return `${bytes}B`
}

/** 合成仓库材料：简介 + README 优先，剩余配额给顶层目录，总长不超过 limit */
export function composeRepoMaterial(
  summary: RepoSummary,
  readme: string,
  entries: RepoEntry[],
  limit = GITHUB_MATERIAL_LIMIT,
): { text: string; truncated: boolean } {
  const slug = `${summary.owner}/${summary.repo}`
  const meta = [
    `【GitHub 仓库】${slug}`,
    summary.description ? `项目简介：${summary.description}` : '项目简介：未填写',
    `主要语言：${summary.language || '未标注'}` +
      (summary.stars ? ` · ${summary.stars} Star` : ''),
  ].join('\n')

  const readmeText = readme.trim()
  const readmeBlock = `\n\n【README】\n${readmeText || '（该仓库没有 README 文件）'}`

  let text = `${meta}${readmeBlock}`
  let truncated = readmeText.length > 0 && text.length > limit

  if (text.length > limit) {
    text = text.slice(0, limit)
    truncated = true
    return { text: `${text}\n…（内容超长，已截断）`, truncated }
  }

  if (entries.length > 0) {
    const dirBlock = `\n\n【顶层文件与目录】\n${entries.map(entryLine).join('\n')}`
    const remaining = limit - text.length
    if (dirBlock.length <= remaining) {
      text += dirBlock
    } else if (remaining > 80) {
      text += `${dirBlock.slice(0, remaining - 20).trimEnd()}\n…（目录已截断）`
      truncated = true
    } else {
      truncated = true
    }
  }

  return { text, truncated }
}
