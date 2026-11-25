import type { Session } from '../types'
import { loadSessions, saveSessions } from './storage'
import { supabase } from './supabase'

const TABLE = 'defense_sessions'
const DEBOUNCE_MS = 900

let cloudUserId: string | null = null
let timer: ReturnType<typeof setTimeout> | null = null
const pending = new Map<string, Session>()

function stamp(session: Session): number {
  return session.updatedAt ?? session.createdAt
}

export function setCloudUser(userId: string | null): void {
  cloudUserId = userId
  if (!userId) {
    if (timer) clearTimeout(timer)
    timer = null
    pending.clear()
  }
}

export function getCloudUserId(): string | null {
  return cloudUserId
}

export function isCloudReady(): boolean {
  return Boolean(supabase) && cloudUserId !== null
}

/** 同一场记录本地与云端都存在时，取最后修改时间较新的一份 */
export function mergeSessions(local: Session[], remote: Session[]): Session[] {
  const map = new Map<string, Session>()
  for (const session of [...local, ...remote]) {
    const existing = map.get(session.id)
    if (!existing) {
      map.set(session.id, session)
      continue
    }
    map.set(session.id, stamp(session) >= stamp(existing) ? session : existing)
  }
  return [...map.values()].sort((a, b) => b.createdAt - a.createdAt)
}

async function pushSessions(sessions: Session[]): Promise<void> {
  if (!supabase || sessions.length === 0) return
  const rows = sessions.map((session) => ({
    id: session.id,
    payload: session,
    updated_at: new Date(stamp(session)).toISOString(),
  }))
  const { error } = await supabase.from(TABLE).upsert(rows, { onConflict: 'id' })
  if (error) throw error
}

async function fetchRemote(): Promise<Session[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from(TABLE)
    .select('payload')
    .order('updated_at', { ascending: false })
    .limit(200)
  if (error) throw error
  return (data ?? [])
    .map((row) => (row as { payload?: Session }).payload)
    .filter((item): item is Session => Boolean(item && item.id))
}

/** 登录后全量同步：云端拉到本地合并，再把本地较新的记录推上去 */
export async function syncAll(): Promise<Session[]> {
  const local = loadSessions()
  if (!isCloudReady()) return local

  const remote = await fetchRemote()
  const remoteMap = new Map(remote.map((session) => [session.id, session]))
  const toPush = local.filter((session) => {
    const cloud = remoteMap.get(session.id)
    return !cloud || stamp(session) > stamp(cloud)
  })

  await pushSessions(toPush)
  const merged = mergeSessions(local, remote)
  saveSessions(merged)
  return merged
}

/** 答辩过程中的写入：防抖后再推到云端，失败静默不打断答辩 */
export function queueCloudSync(session: Session): void {
  if (!isCloudReady()) return
  pending.set(session.id, session)
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    void flushCloudSync()
  }, DEBOUNCE_MS)
}

export async function flushCloudSync(): Promise<boolean> {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
  if (!isCloudReady() || pending.size === 0) return false
  const sessions = [...pending.values()]
  pending.clear()
  try {
    await pushSessions(sessions)
    return true
  } catch {
    return false
  }
}

export async function deleteCloudSession(id: string): Promise<boolean> {
  if (!supabase || !isCloudReady()) return false
  const { error } = await supabase.from(TABLE).delete().eq('id', id)
  return !error
}

export async function clearCloudSessions(): Promise<boolean> {
  if (!supabase || !isCloudReady() || !cloudUserId) return false
  const { error } = await supabase.from(TABLE).delete().eq('user_id', cloudUserId)
  return !error
}
