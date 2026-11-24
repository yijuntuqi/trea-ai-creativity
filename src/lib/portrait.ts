import type { Material, Portrait, SessionConfig } from '../types'
import { runTask } from './llm'
import { parseLooseJSON } from './json'

const DEFAULT_INNOVATION = '材料未明确标注创新点，建议补充与已有工作的差异'
const DEFAULT_EVIDENCE = '材料未提供明确证据，建议补充关键数据'
const DEFAULT_LIMITATIONS = '材料未说明研究局限，建议主动补充'

function firstLine(text: string): string {
  return (
    text
      .split('\n')
      .map((line) => line.trim())
      .find(Boolean) ?? ''
  )
}

function stripPrefix(line: string): string {
  const index = line.indexOf('：')
  return index >= 0 ? line.slice(index + 1).trim() : line
}

export function genericPortrait(text: string): Portrait {
  const head = firstLine(text)
  const topic = (stripPrefix(head) || '答辩材料').slice(0, 60)
  const methodLine = text
    .split('\n')
    .map((line) => line.trim())
    .find((line) => /^方法|^研究方法/.test(line))

  return {
    topic,
    problem: head.slice(0, 120) || '材料未明确说明研究问题',
    method: methodLine ? stripPrefix(methodLine) : '材料中未明确说明',
    innovation: [DEFAULT_INNOVATION],
    evidence: [DEFAULT_EVIDENCE],
    limitations: [DEFAULT_LIMITATIONS],
    keywords: ['答辩材料'],
  }
}

function asString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function asArray(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback
  const list = value
    .filter((item): item is string => typeof item === 'string' && item.trim() !== '')
    .map((item) => item.trim())
  return list.length > 0 ? list : fallback
}

function normalizePortrait(raw: Partial<Portrait>, text: string): Portrait {
  const fallback = genericPortrait(text)
  return {
    topic: asString(raw.topic, fallback.topic),
    problem: asString(raw.problem, fallback.problem),
    method: asString(raw.method, fallback.method),
    innovation: asArray(raw.innovation, fallback.innovation),
    evidence: asArray(raw.evidence, fallback.evidence),
    limitations: asArray(raw.limitations, fallback.limitations),
    keywords: asArray(raw.keywords, fallback.keywords),
  }
}

export async function generatePortrait(
  material: Material,
  config: SessionConfig,
  onDelta?: (text: string) => void,
): Promise<{ portrait: Portrait; source: 'live' | 'mock' }> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const result = await runTask(
      'portrait',
      { material: material.text, config },
      onDelta ?? (() => {}),
    )
    try {
      const parsed = parseLooseJSON<Partial<Portrait>>(result.text)
      return { portrait: normalizePortrait(parsed, material.text), source: result.source }
    } catch {
      // 解析失败重试一次
    }
  }

  return { portrait: genericPortrait(material.text), source: 'mock' }
}
