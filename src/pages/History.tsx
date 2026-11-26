import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Session } from '../types'
import { clearCloudSessions, deleteCloudSession } from '../lib/cloud'
import { clearSessions, deleteSession, loadSessions } from '../lib/storage'
import { canRetryWithMaterial, getGuestUploadSession, type PlanTier } from '../lib/entitlement'
import { typeLabel } from '../lib/labels'
import { useAuthStore } from '../store/auth'
import { useSessionStore } from '../store/session'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'

function statusLabel(session: Session): string {
  if (session.status === 'finished' && session.report) {
    return `${session.report.total} 分 · ${session.report.level}`
  }
  if (session.status === 'ongoing') return '进行中'
  if (session.status === 'ready') return '待开始答辩'
  return '待开始'
}

function sessionTitle(session: Session): string {
  return session.material.fileName ?? '粘贴材料'
}

function originLabel(session: Session, sessions: Session[]): string | null {
  if (!session.retryFrom) return null
  const exists = sessions.some((item) => item.id === session.retryFrom?.id)
  if (!exists) return null
  const date = new Date(session.retryFrom.createdAt)
  return `源自 ${date.getMonth() + 1} 月 ${date.getDate()} 日那场`
}

export default function History() {
  const navigate = useNavigate()
  const restore = useSessionStore((state) => state.restore)
  const startRetry = useSessionStore((state) => state.startRetry)
  const user = useAuthStore((state) => state.user)
  const profile = useAuthStore((state) => state.profile)
  const isVip = useAuthStore((state) => state.isVip)
  const syncAt = useAuthStore((state) => state.syncAt)
  const [sessions, setSessions] = useState<Session[]>(() => loadSessions())

  const tier: PlanTier = user ? (isVip ? 'vip' : 'free') : 'guest'
  const guestUploadSessionId = getGuestUploadSession()

  function retryAllowed(session: Session): boolean {
    return canRetryWithMaterial({
      tier,
      freeUploadUsed: Boolean(profile?.free_upload_used_at),
      guestUploadSessionId,
      hasFile: Boolean(session.material.fileName),
    })
  }

  useEffect(() => {
    if (user) void useAuthStore.getState().syncNow()
  }, [user?.id])

  useEffect(() => {
    setSessions(loadSessions())
  }, [syncAt, user?.id])

  function remove(session: Session) {
    const confirmed = window.confirm(
      `确定删除「${sessionTitle(session)}」这场记录？删除后不可恢复。`,
    )
    if (!confirmed) return
    deleteSession(session.id)
    void deleteCloudSession(session.id)
    setSessions(loadSessions())
  }

  function clearAll() {
    if (!window.confirm('确定清空全部预演记录？该操作不可撤销。')) return
    clearSessions()
    void clearCloudSessions()
    setSessions([])
  }

  function resume(session: Session) {
    restore(session.id)
    navigate(session.status === 'ongoing' ? `/session/${session.id}` : '/material')
  }

  function retry(session: Session) {
    startRetry(session)
    navigate('/material')
  }

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl text-paper">历史记录</h1>
          <p className="mt-2 text-sm text-paper/60">
            {user
              ? `已登录 ${user.email}，云端与本机记录已合并，共 ${sessions.length} 场。`
              : `本机保存的过往场次，共 ${sessions.length} 场。登录后可跨设备同步。`}
          </p>
        </div>
        {sessions.length > 0 && (
          <Button variant="ghost" onClick={clearAll}>
            清空全部
          </Button>
        )}
      </header>

      {sessions.length === 0 ? (
        <Card className="space-y-4 py-12 text-center">
          <p className="text-sm text-paper/60">还没有预演记录</p>
          <Button onClick={() => navigate('/setup')}>开始第一场</Button>
        </Card>
      ) : (
        <ul className="space-y-3">
          {sessions.map((session) => (
            <li key={session.id}>
              <Card className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-paper/85">
                    {typeLabel(session.config)} · {sessionTitle(session)}
                  </p>
                  {originLabel(session, sessions) && (
                    <span className="mt-1 inline-block rounded-full border border-white/12 bg-white/[0.03] px-2 py-0.5 text-[11px] text-paper/45">
                      {originLabel(session, sessions)}
                    </span>
                  )}
                  <p className="mt-1 text-xs text-paper/45">
                    {new Date(session.createdAt).toLocaleString('zh-CN')}
                    <span className="mx-1">·</span>
                    <span>{statusLabel(session)}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {session.report && (
                    <Button onClick={() => navigate(`/report/${session.id}`)}>查看报告</Button>
                  )}
                  {session.status === 'finished' &&
                    (retryAllowed(session) ? (
                      <Button variant="ghost" onClick={() => retry(session)}>
                        再练一场
                      </Button>
                    ) : (
                      <Button variant="ghost" onClick={() => navigate('/vip')}>
                        升级 VIP 再练
                      </Button>
                    ))}
                  {session.status === 'ongoing' && (
                    <Button onClick={() => resume(session)}>继续答辩</Button>
                  )}
                  {session.status === 'ready' && (
                    <Button onClick={() => resume(session)}>继续准备</Button>
                  )}
                  <Button variant="ghost" onClick={() => remove(session)}>
                    删除
                  </Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
