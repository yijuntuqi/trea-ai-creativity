import { describe, expect, it, beforeEach } from 'vitest'
import {
  canRetryWithMaterial,
  canUploadFiles,
  checkFileSizes,
  formatBytes,
  getGuestUploadSession,
  isVipActive,
  markGuestUploadSession,
  planOf,
  planTier,
  vipDaysLeft,
  type Profile,
} from './entitlement'

const MB = 1024 * 1024

function profile(patch: Partial<Profile> = {}): Profile {
  return {
    id: 'u1',
    email: 'a@b.com',
    display_name: 'A',
    avatar_url: null,
    plan: 'free',
    vip_expires_at: null,
    free_upload_used_at: null,
    free_upload_session_id: null,
    ...patch,
  }
}

beforeEach(() => {
  localStorage.clear()
})

describe('isVipActive / planTier', () => {
  it('未登录是 guest', () => {
    expect(planTier(null)).toBe('guest')
    expect(isVipActive(null)).toBe(false)
  })

  it('free 用户不是 VIP', () => {
    expect(planTier(profile())).toBe('free')
  })

  it('VIP 有效期内生效，过期后失效', () => {
    const now = Date.parse('2026-11-26T00:00:00Z')
    const active = profile({ plan: 'vip', vip_expires_at: '2026-12-01T00:00:00Z' })
    const expired = profile({ plan: 'vip', vip_expires_at: '2026-11-01T00:00:00Z' })
    expect(isVipActive(active, now)).toBe(true)
    expect(planTier(active, now)).toBe('vip')
    expect(isVipActive(expired, now)).toBe(false)
    expect(planTier(expired, now)).toBe('free')
  })

  it('VIP 无到期时间视为长期有效', () => {
    expect(isVipActive(profile({ plan: 'vip', vip_expires_at: null }))).toBe(true)
  })
})

describe('checkFileSizes', () => {
  it('免费单文件 5MB 上限', () => {
    expect(checkFileSizes([{ name: 'a.pdf', size: 5 * MB }], 0, 'free').ok).toBe(true)
    const result = checkFileSizes([{ name: 'big.pdf', size: 6 * MB }], 0, 'free')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.message).toContain('单文件上限 5MB')
  })

  it('VIP 单文件 20MB 上限', () => {
    expect(checkFileSizes([{ name: 'a.pdf', size: 18 * MB }], 0, 'vip').ok).toBe(true)
    const result = checkFileSizes([{ name: 'big.pdf', size: 21 * MB }], 0, 'vip')
    expect(result.ok).toBe(false)
  })

  it('累计大小限制区分角色', () => {
    const files = [
      { name: 'a.pdf', size: 5 * MB },
      { name: 'b.pdf', size: 5 * MB },
    ]
    expect(checkFileSizes(files, 0, 'free').ok).toBe(true)
    expect(checkFileSizes(files, MB, 'free').ok).toBe(false)
    expect(checkFileSizes(files, 45 * MB, 'vip').ok).toBe(false)
  })

  it('formatBytes', () => {
    expect(formatBytes(5 * MB)).toBe('5MB')
    expect(formatBytes(1.5 * MB)).toBe('1.5MB')
    expect(formatBytes(2048)).toBe('2KB')
  })
})

describe('canUploadFiles', () => {
  const base = {
    sessionId: 's_now',
    freeUploadUsed: false,
    freeUploadSessionId: null,
    guestUploadSessionId: null,
  }

  it('VIP 永远可上传', () => {
    expect(
      canUploadFiles({ ...base, tier: 'vip', freeUploadUsed: true, guestUploadSessionId: 's_old' }),
    ).toBe(true)
  })

  it('免费用户额度未用时可上传', () => {
    expect(canUploadFiles({ ...base, tier: 'free' })).toBe(true)
  })

  it('免费额度已用：只能在同一场继续上传', () => {
    expect(
      canUploadFiles({ ...base, tier: 'free', freeUploadUsed: true, freeUploadSessionId: 's_old' }),
    ).toBe(false)
    expect(
      canUploadFiles({ ...base, tier: 'free', freeUploadUsed: true, freeUploadSessionId: 's_now' }),
    ).toBe(true)
  })

  it('未登录只看本机记录', () => {
    expect(canUploadFiles({ ...base, tier: 'guest', guestUploadSessionId: 's_old' })).toBe(false)
    expect(canUploadFiles({ ...base, tier: 'guest', guestUploadSessionId: 's_now' })).toBe(true)
  })
})

describe('canRetryWithMaterial', () => {
  it('纯文本材料始终可以再练', () => {
    expect(
      canRetryWithMaterial({
        tier: 'free',
        freeUploadUsed: true,
        guestUploadSessionId: 's_old',
        hasFile: false,
      }),
    ).toBe(true)
  })

  it('带文件时按角色限制', () => {
    expect(
      canRetryWithMaterial({
        tier: 'free',
        freeUploadUsed: false,
        guestUploadSessionId: null,
        hasFile: true,
      }),
    ).toBe(true)
    expect(
      canRetryWithMaterial({
        tier: 'free',
        freeUploadUsed: true,
        guestUploadSessionId: null,
        hasFile: true,
      }),
    ).toBe(false)
    expect(
      canRetryWithMaterial({
        tier: 'vip',
        freeUploadUsed: true,
        guestUploadSessionId: 's_old',
        hasFile: true,
      }),
    ).toBe(true)
  })
})

describe('guest 本机额度', () => {
  it('记录并读取', () => {
    expect(getGuestUploadSession()).toBeNull()
    markGuestUploadSession('s_1')
    expect(getGuestUploadSession()).toBe('s_1')
  })
})

describe('套餐与到期展示', () => {
  it('按 code 取套餐', () => {
    expect(planOf('month')?.days).toBe(30)
    expect(planOf('year')?.priceCents).toBe(6800)
  })

  it('计算剩余天数', () => {
    const now = Date.parse('2026-11-26T00:00:00Z')
    expect(vipDaysLeft(profile({ plan: 'vip', vip_expires_at: '2026-12-06T00:00:00Z' }), now)).toBe(10)
    expect(vipDaysLeft(profile({ plan: 'vip', vip_expires_at: '2026-11-01T00:00:00Z' }), now)).toBe(0)
  })
})
