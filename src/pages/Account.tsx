import { useState } from 'react'
import { useAuthStore } from '../store/auth'
import { isCloudEnabled } from '../lib/supabase'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'

type Mode = 'signIn' | 'signUp'

function syncLabel(status: string): string {
  if (status === 'syncing') return '同步中…'
  if (status === 'ok') return '已同步'
  if (status === 'error') return '同步失败，稍后自动重试'
  return '未同步'
}

export default function Account() {
  const user = useAuthStore((state) => state.user)
  const busy = useAuthStore((state) => state.busy)
  const error = useAuthStore((state) => state.error)
  const notice = useAuthStore((state) => state.notice)
  const sync = useAuthStore((state) => state.sync)
  const syncAt = useAuthStore((state) => state.syncAt)
  const signIn = useAuthStore((state) => state.signIn)
  const signUp = useAuthStore((state) => state.signUp)
  const signOut = useAuthStore((state) => state.signOut)
  const syncNow = useAuthStore((state) => state.syncNow)
  const clearFeedback = useAuthStore((state) => state.clearFeedback)

  const [mode, setMode] = useState<Mode>('signIn')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')

  function switchMode(next: Mode) {
    setMode(next)
    clearFeedback()
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!email.trim() || !password) return
    if (mode === 'signUp' && password !== confirm) {
      useAuthStore.setState({ error: '两次输入的密码不一致' })
      return
    }
    if (mode === 'signIn') await signIn(email, password)
    else await signUp(email, password)
  }

  if (!isCloudEnabled) {
    return (
      <section className="mx-auto max-w-xl space-y-6">
        <header>
          <h1 className="font-serif text-3xl text-paper">账号</h1>
          <p className="mt-2 text-sm text-paper/60">当前部署未配置云端账号服务。</p>
        </header>
        <Card className="space-y-3">
          <p className="text-sm text-paper/70">
            不登录也能完整使用：所有答辩记录保存在这台设备的浏览器里。
          </p>
          <p className="text-xs leading-relaxed text-paper/45">
            配置 VITE_SUPABASE_URL 与 VITE_SUPABASE_ANON_KEY 后即可启用邮箱账号与跨设备同步。
          </p>
        </Card>
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-xl space-y-6">
      <header>
        <h1 className="font-serif text-3xl text-paper">账号</h1>
        <p className="mt-2 text-sm text-paper/60">
          登录后历史记录自动同步到云端，换设备也能接着练。不登录也能正常使用，记录只存在本机。
        </p>
      </header>

      {user ? (
        <Card className="space-y-5">
          <div>
            <p className="text-xs text-paper/40">当前账号</p>
            <p className="mt-1 text-sm text-paper/85">{user.email}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-paper/50">
            <span className="rounded-full border border-white/12 bg-white/[0.03] px-3 py-1">
              {syncLabel(sync)}
            </span>
            {syncAt && <span>上次同步 {new Date(syncAt).toLocaleTimeString('zh-CN')}</span>}
          </div>
          <p className="text-xs leading-relaxed text-paper/45">
            同步内容包括材料解析后的文本、问答过程与报告；原始上传文件不会上传。
          </p>
          {error && <p className="text-sm text-red-300">{error}</p>}
          {notice && <p className="text-sm text-gold/85">{notice}</p>}
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="ghost" disabled={busy || sync === 'syncing'} onClick={() => void syncNow()}>
              立即同步
            </Button>
            <Button variant="ghost" disabled={busy} onClick={() => void signOut()}>
              退出登录
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="space-y-5">
          <div className="flex gap-2">
            <button
              type="button"
              aria-pressed={mode === 'signIn'}
              onClick={() => switchMode('signIn')}
              className={
                mode === 'signIn'
                  ? 'rounded-full border border-gold/60 bg-gold/[0.12] px-4 py-1.5 text-xs text-gold'
                  : 'rounded-full border border-white/12 bg-white/[0.02] px-4 py-1.5 text-xs text-paper/60 transition hover:text-paper'
              }
            >
              登录
            </button>
            <button
              type="button"
              aria-pressed={mode === 'signUp'}
              onClick={() => switchMode('signUp')}
              className={
                mode === 'signUp'
                  ? 'rounded-full border border-gold/60 bg-gold/[0.12] px-4 py-1.5 text-xs text-gold'
                  : 'rounded-full border border-white/12 bg-white/[0.02] px-4 py-1.5 text-xs text-paper/60 transition hover:text-paper'
              }
            >
              注册
            </button>
          </div>

          <form className="space-y-3" onSubmit={(event) => void submit(event)}>
            <label className="block space-y-2">
              <span className="text-xs text-paper/50">邮箱</span>
              <Input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-xs text-paper/50">密码（至少 6 位）</span>
              <Input
                type="password"
                autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
                required
                minLength={6}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••"
              />
            </label>
            {mode === 'signUp' && (
              <label className="block space-y-2">
                <span className="text-xs text-paper/50">确认密码</span>
                <Input
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={6}
                  value={confirm}
                  onChange={(event) => setConfirm(event.target.value)}
                  placeholder="••••••"
                />
              </label>
            )}

            {error && <p className="text-sm text-red-300">{error}</p>}
            {notice && <p className="text-sm leading-relaxed text-gold/85">{notice}</p>}

            <div className="flex items-center justify-between gap-3 pt-1">
              <span className="text-xs text-paper/35">
                {mode === 'signUp' ? '注册后需先完成邮箱验证' : '忘记密码可联系项目组重置'}
              </span>
              <Button type="submit" disabled={busy}>
                {busy ? '处理中…' : mode === 'signIn' ? '登录' : '注册'}
              </Button>
            </div>
          </form>

          <p className="border-t border-white/[0.07] pt-4 text-xs leading-relaxed text-paper/40">
            登录后材料解析文本与答辩记录会同步到云端，原始文件始终只在浏览器内解析、不会上传。
          </p>
        </Card>
      )}
    </section>
  )
}
