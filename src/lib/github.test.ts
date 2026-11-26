import { describe, expect, it } from 'vitest'
import { composeRepoMaterial, parseRepoUrl } from './github'

describe('parseRepoUrl', () => {
  it('接受标准仓库地址', () => {
    expect(parseRepoUrl('https://github.com/facebook/react')).toEqual({
      owner: 'facebook',
      repo: 'react',
      slug: 'facebook/react',
    })
  })

  it('接受 .git 后缀、末尾斜杠、查询参数', () => {
    expect(parseRepoUrl('https://github.com/owner/repo.git')?.slug).toBe('owner/repo')
    expect(parseRepoUrl('https://github.com/owner/repo/')?.slug).toBe('owner/repo')
    expect(parseRepoUrl('https://github.com/owner/repo?tab=readme')?.slug).toBe('owner/repo')
  })

  it('接受省略协议的地址', () => {
    expect(parseRepoUrl('github.com/owner/repo')?.slug).toBe('owner/repo')
  })

  it('拒绝非 github 域名与深层路径', () => {
    expect(parseRepoUrl('https://gitlab.com/owner/repo')).toBeNull()
    expect(parseRepoUrl('https://github.com.evil.com/owner/repo')).toBeNull()
    expect(parseRepoUrl('https://github.com/owner/repo/tree/main')).toBeNull()
    expect(parseRepoUrl('https://github.com/owner')).toBeNull()
    expect(parseRepoUrl('javascript:alert(1)')).toBeNull()
    expect(parseRepoUrl('')).toBeNull()
  })

  it('拒绝非法字符', () => {
    expect(parseRepoUrl('https://github.com/ow ner/repo')).toBeNull()
    expect(parseRepoUrl('https://github.com/owner/repo<script>')).toBeNull()
  })
})

describe('composeRepoMaterial', () => {
  const summary = {
    owner: 'owner',
    repo: 'repo',
    description: '一个演示项目',
    language: 'TypeScript',
    stars: 12,
  }

  it('包含简介、README 与目录', () => {
    const { text, truncated } = composeRepoMaterial(
      summary,
      '# 标题\n正文内容',
      [
        { name: 'src', type: 'dir' },
        { name: 'package.json', type: 'file', size: 2048 },
      ],
    )
    expect(truncated).toBe(false)
    expect(text).toContain('owner/repo')
    expect(text).toContain('一个演示项目')
    expect(text).toContain('【README】')
    expect(text).toContain('- src/（目录）')
    expect(text).toContain('- package.json （2KB）')
  })

  it('超长 README 截断到上限', () => {
    const { text, truncated } = composeRepoMaterial(summary, 'a'.repeat(30000), [], 20000)
    expect(truncated).toBe(true)
    expect(text.length).toBeLessThanOrEqual(20040)
    expect(text).toContain('已截断')
  })

  it('目录超出剩余配额时截断目录', () => {
    const entries = Array.from({ length: 2000 }, (_, index) => ({
      name: `file-${index}.ts`,
      type: 'file' as const,
      size: 100,
    }))
    const { text, truncated } = composeRepoMaterial(summary, 'brief', entries, 2000)
    expect(truncated).toBe(true)
    expect(text.length).toBeLessThanOrEqual(2000)
    expect(text).toContain('【README】')
  })

  it('没有 README 时给出说明', () => {
    const { text } = composeRepoMaterial(summary, '   ', [])
    expect(text).toContain('没有 README')
  })
})
