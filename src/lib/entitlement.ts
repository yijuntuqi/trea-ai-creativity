export type PlanTier = 'guest' | 'free' | 'vip'

export type Profile = {
  id: string
  email: string | null
  display_name: string | null
  avatar_url: string | null
  plan: 'free' | 'vip'
  vip_expires_at: string | null
  free_upload_used_at: string | null
  free_upload_session_id: string | null
}

export type UploadLimits = {
  /** 单个文件大小上限（字节） */
  perFileBytes: number
  /** 单场累计大小上限（字节） */
  totalBytes: number
}

const MB = 1024 * 1024

export const UPLOAD_LIMITS: Record<PlanTier, UploadLimits> = {
  guest: { perFileBytes: 5 * MB, totalBytes: 10 * MB },
  free: { perFileBytes: 5 * MB, totalBytes: 10 * MB },
  vip: { perFileBytes: 20 * MB, totalBytes: 50 * MB },
}

export type PlanCode = 'month' | 'quarter' | 'year'

export type VipPlan = {
  code: PlanCode
  name: string
  days: number
  priceCents: number
  priceLabel: string
  tagline: string
}

export const VIP_PLANS: VipPlan[] = [
  { code: 'month', name: '月度会员', days: 30, priceCents: 990, priceLabel: '9.9', tagline: '先练一个月，赶答辩' },
  { code: 'quarter', name: '季度会员', days: 90, priceCents: 2500, priceLabel: '25', tagline: '开题到答辩全覆盖' },
  { code: 'year', name: '年度会员', days: 365, priceCents: 6800, priceLabel: '68', tagline: '长期打磨，性价比最高' },
]

const GUEST_UPLOAD_KEY = 'dr:free-upload-used'

export function isVipActive(profile: Profile | null, now = Date.now()): boolean {
  if (!profile || profile.plan !== 'vip') return false
  if (!profile.vip_expires_at) return true
  const expires = Date.parse(profile.vip_expires_at)
  return Number.isFinite(expires) && expires > now
}

export function planTier(profile: Profile | null, now = Date.now()): PlanTier {
  if (!profile) return 'guest'
  return isVipActive(profile, now) ? 'vip' : 'free'
}

export function limitsFor(tier: PlanTier): UploadLimits {
  return UPLOAD_LIMITS[tier]
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0MB'
  if (bytes >= MB) {
    const value = bytes / MB
    return `${Number.isInteger(value) ? value : value.toFixed(1)}MB`
  }
  if (bytes >= 1024) return `${Math.round(bytes / 1024)}KB`
  return `${bytes}B`
}

export function planOf(code: PlanCode): VipPlan | undefined {
  return VIP_PLANS.find((plan) => plan.code === code)
}

export function vipExpiryLabel(profile: Profile | null): string | null {
  if (!profile || !profile.vip_expires_at) return null
  const date = new Date(profile.vip_expires_at)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString('zh-CN')
}

export function vipDaysLeft(profile: Profile | null, now = Date.now()): number | null {
  if (!profile || !profile.vip_expires_at) return null
  const expires = Date.parse(profile.vip_expires_at)
  if (!Number.isFinite(expires)) return null
  const days = Math.ceil((expires - now) / (24 * 60 * 60 * 1000))
  return Math.max(0, days)
}

export type SizeCheck = { ok: true } | { ok: false; message: string }

/** 校验一批文件的大小：单文件优先，其次累计 */
export function checkFileSizes(
  files: Array<{ name: string; size: number }>,
  existingBytes: number,
  tier: PlanTier,
): SizeCheck {
  const limits = limitsFor(tier)
  let total = existingBytes
  for (const file of files) {
    if (file.size > limits.perFileBytes) {
      return {
        ok: false,
        message:
          `「${file.name}」${formatBytes(file.size)} 超出单文件上限 ${formatBytes(limits.perFileBytes)}` +
          (tier === 'vip' ? '。' : '，升级 VIP 可上传至 20MB。'),
      }
    }
    total += file.size
  }
  if (total > limits.totalBytes) {
    return {
      ok: false,
      message:
        `本场材料累计 ${formatBytes(total)} 超出上限 ${formatBytes(limits.totalBytes)}` +
        (tier === 'vip' ? '。' : '，升级 VIP 可至 50MB。'),
    }
  }
  return { ok: true }
}

export type UploadGateInput = {
  tier: PlanTier
  sessionId: string
  freeUploadUsed: boolean
  freeUploadSessionId: string | null
  guestUploadSessionId: string | null
}

/** 是否还能在这一场里上传文件（免费额度只能绑定一场） */
export function canUploadFiles(input: UploadGateInput): boolean {
  if (input.tier === 'vip') return true
  if (input.tier === 'free') {
    if (!input.freeUploadUsed) return true
    return input.freeUploadSessionId === input.sessionId
  }
  if (!input.guestUploadSessionId) return true
  return input.guestUploadSessionId === input.sessionId
}

export type RetryGateInput = {
  tier: PlanTier
  freeUploadUsed: boolean
  guestUploadSessionId: string | null
  hasFile: boolean
}

/** 带文件的历史场次，免费额度用完后不能通过「再练一场」重新上传 */
export function canRetryWithMaterial(input: RetryGateInput): boolean {
  if (!input.hasFile) return true
  if (input.tier === 'vip') return true
  if (input.tier === 'free') return !input.freeUploadUsed
  return !input.guestUploadSessionId
}

export function getGuestUploadSession(): string | null {
  try {
    const value = localStorage.getItem(GUEST_UPLOAD_KEY)
    return value && value.length <= 64 ? value : null
  } catch {
    return null
  }
}

export function markGuestUploadSession(sessionId: string): void {
  try {
    localStorage.setItem(GUEST_UPLOAD_KEY, sessionId)
  } catch {
    // 隐私模式下忽略，不阻断答辩
  }
}
