import { create } from 'zustand'
import type { Session as AuthSession } from '@supabase/supabase-js'
import { isCloudReady, setCloudUser, syncAll } from '../lib/cloud'
import { isVipActive, type Profile } from '../lib/entitlement'
import { supabase } from '../lib/supabase'

export type AuthUser = { id: string; email: string }
export type SyncStatus = 'idle' | 'syncing' | 'ok' | 'error'

type AuthState = {
  user: AuthUser | null
  /**
   * 登录用户的档案（会员等级、到期时间、免费上传额度）。
   * 未登录或未配置云端时为 null。
   */
  profile: Profile | null
  isVip: boolean
  ready: boolean
  busy: boolean
  error: string | null
  notice: string | null
  sync: SyncStatus
  syncAt: number | null
  /** 用户从重置密码邮件点进来时为 true，展示设置新密码表单 */
  recovering: boolean
  init(): Promise<void>
  signIn(email: string, password: string): Promise<boolean>
  signUp(email: string, password: string): Promise<boolean>
  signInWithGitHub(): Promise<void>
  sendPasswordReset(email: string): Promise<boolean>
  updatePassword(password: string): Promise<boolean>
  signOut(): Promise<void>
  syncNow(): Promise<void>
  refreshProfile(): Promise<void>
  clearFeedback(): void
}

function toUser(session: AuthSession | null): AuthUser | null {
  if (!session?.user) return null
  return { id: session.user.id, email: session.user.email ?? '' }
}

function errorMessage(raw: string): string {
  const text = raw.toLowerCase()
  if (text.includes('invalid login credentials')) return '邮箱或密码不正确'
  if (text.includes('email not confirmed')) return '邮箱还没验证，请先点开验证邮件里的链接'
  if (text.includes('already registered') || text.includes('already been registered')) {
    return '该邮箱已注册，请直接登录'
  }
  if (text.includes('password should be at least')) return '密码至少 8 位，且包含大小写字母、数字和符号'
  if (text.includes('password')) return '密码不符合要求：至少 8 位，需包含大小写字母、数字和符号'
  if (text.includes('provider is not enabled')) return '该登录方式尚未在 Supabase 后台开启'
  if (text.includes('rate limit') || text.includes('too many')) return '操作过于频繁，请稍后再试'
  if (text.includes('unable to validate email') || text.includes('invalid email')) return '邮箱格式不正确'
  if (text.includes('signups not allowed')) return '当前项目未开放注册'
  return raw
}

let initialized = false

export const useAuthStore = create<AuthState>((set, get) => {
  function applyUser(user: AuthUser | null) {
    set({ user })
    setCloudUser(user?.id ?? null)
    if (!user) set({ profile: null, isVip: false })
  }

  return {
    user: null,
    profile: null,
    isVip: false,
    ready: false,
    busy: false,
    error: null,
    notice: null,
    sync: 'idle',
    syncAt: null,
    recovering: false,

    async init() {
      if (initialized) return
      initialized = true
      if (!supabase) {
        set({ ready: true })
        return
      }
      const { data } = await supabase.auth.getSession()
      const user = toUser(data.session)
      applyUser(user)
      set({ ready: true })

      supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'PASSWORD_RECOVERY') set({ recovering: true, notice: null, error: null })
        const next = toUser(session)
        const prev = get().user
        applyUser(next)
        if (next && prev?.id !== next.id) void get().syncNow()
        void get().refreshProfile()
      })

      if (user) {
        void get().refreshProfile()
        void get().syncNow()
      }
    },

    async signIn(email, password) {
      set({ error: null, notice: null })
      if (!supabase) {
        set({ error: '账号服务未配置，当前只能本机保存记录' })
        return false
      }
      set({ busy: true })
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      set({ busy: false })
      if (error) {
        set({ error: errorMessage(error.message) })
        return false
      }
      applyUser(toUser(data.session))
      set({ notice: '已登录，正在同步历史记录…' })
      await get().refreshProfile()
      await get().syncNow()
      return true
    },

    async signUp(email, password) {
      set({ error: null, notice: null })
      if (!supabase) {
        set({ error: '账号服务未配置，当前只能本机保存记录' })
        return false
      }
      set({ busy: true })
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: window.location.origin },
      })
      set({ busy: false })
      if (error) {
        set({ error: errorMessage(error.message) })
        return false
      }
      if (data.session) {
        applyUser(toUser(data.session))
        set({ notice: '注册成功，正在同步历史记录…' })
        await get().refreshProfile()
        await get().syncNow()
        return true
      }
      set({
        notice: `验证邮件已发送到 ${email.trim()}，点开邮件里的链接完成验证后，再回到这里登录。`,
      })
      return true
    },

    async signInWithGitHub() {
      set({ error: null, notice: null })
      if (!supabase) {
        set({ error: '账号服务未配置，当前只能本机保存记录' })
        return
      }
      // GitHub 授权后跳回本页，OAuth 邮箱默认视为已验证
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: { redirectTo: `${window.location.origin}/account` },
      })
      if (error) set({ error: errorMessage(error.message) })
    },

    async sendPasswordReset(email) {
      set({ error: null, notice: null })
      if (!supabase) {
        set({ error: '账号服务未配置，当前只能本机保存记录' })
        return false
      }
      set({ busy: true })
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/account`,
      })
      set({ busy: false })
      if (error) {
        set({ error: errorMessage(error.message) })
        return false
      }
      set({ notice: `重置邮件已发送到 ${email.trim()}，点开邮件里的链接后会回到本页设置新密码。` })
      return true
    },

    async updatePassword(password) {
      set({ error: null, notice: null })
      if (!supabase) return false
      set({ busy: true })
      const { error } = await supabase.auth.updateUser({ password })
      set({ busy: false })
      if (error) {
        set({ error: errorMessage(error.message) })
        return false
      }
      set({ recovering: false, notice: '密码已更新，之后可用新密码登录。' })
      return true
    },

    async signOut() {
      if (!supabase) return
      set({ busy: true })
      await supabase.auth.signOut()
      applyUser(null)
      set({
        busy: false,
        recovering: false,
        sync: 'idle',
        syncAt: null,
        notice: '已退出登录，记录仍保留在本机。',
      })
    },

    async refreshProfile() {
      const current = get().user
      if (!supabase || !current) {
        set({ profile: null, isVip: false })
        return
      }
      const { data, error } = await supabase
        .from('profiles')
        .select(
          'id,email,display_name,avatar_url,plan,vip_expires_at,free_upload_used_at,free_upload_session_id',
        )
        .eq('id', current.id)
        .maybeSingle()
      if (error || !data) return
      const profile = data as unknown as Profile
      set({ profile, isVip: isVipActive(profile) })
    },

    async syncNow() {
      if (!isCloudReady()) {
        set({ sync: 'idle' })
        return
      }
      if (get().sync === 'syncing') return
      set({ sync: 'syncing' })
      try {
        await syncAll()
        set({ sync: 'ok', syncAt: Date.now(), notice: null })
      } catch {
        set({ sync: 'error' })
      }
    },

    clearFeedback() {
      set({ error: null, notice: null })
    },
  }
})
