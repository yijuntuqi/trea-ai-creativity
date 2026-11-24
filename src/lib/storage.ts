import type { Session } from '../types'

const KEY = 'dr:sessions'
const LIMIT = 20

export function loadSessions(): Session[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return (parsed as Session[])
      .slice()
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, LIMIT)
  } catch {
    return []
  }
}

export function getSession(id: string): Session | undefined {
  return loadSessions().find((session) => session.id === id)
}

export function saveSession(session: Session): void {
  try {
    const list = loadSessions().filter((item) => item.id !== session.id)
    list.unshift(session)
    const next = list.sort((a, b) => b.createdAt - a.createdAt).slice(0, LIMIT)
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // 存储失败（隐私模式/超额）不阻塞答辩流程
  }
}

export function deleteSession(id: string): void {
  try {
    const next = loadSessions().filter((session) => session.id !== id)
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // 忽略
  }
}

export function clearSessions(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // 忽略
  }
}
