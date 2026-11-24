import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { DefenseType, Session } from '../types'
import { clearSessions, deleteSession, loadSessions } from '../lib/storage'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'

const TYPE_LABEL: Record<DefenseType, string> = {
  undergrad: '本科答辩',
  master: '硕博答辩',
  project: '项目答辩',
  course: '课程汇报',
}

function statusLabel(session: Session): string {
  if (session.status === 'finished' && session.report) {
    return `${session.report.total} 分 · ${session.report.level}`
  }
  if (session.status === 'ongoing') return '进行中'
  return '待开始'
}

export default function History() {
  const navigate = useNavigate()
  const [sessions, setSessions] = useState<Session[]>(() => loadSessions())

  function remove(id: string) {
    deleteSession(id)
    setSessions(loadSessions())
  }

  function clearAll() {
    if (!window.confirm('确定清空全部预演记录？该操作不可撤销。')) return
    clearSessions()
    setSessions([])
  }

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl text-paper">历史记录</h1>
          <p className="mt-2 text-sm text-paper/60">本机保存的过往场次，共 {sessions.length} 场。</p>
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
                    {TYPE_LABEL[session.config.type]} · {session.material.fileName ?? '粘贴材料'}
                  </p>
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
                  {session.status === 'ongoing' && (
                    <Button onClick={() => navigate(`/session/${session.id}`)}>继续</Button>
                  )}
                  <Button variant="ghost" onClick={() => remove(session.id)}>
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
