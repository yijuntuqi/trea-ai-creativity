import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { canCallToday, consumeCall, resetQuotaForTest } from './quota'

beforeEach(() => {
  localStorage.clear()
  resetQuotaForTest()
})

afterEach(() => {
  vi.useRealTimers()
})

it('allows the first call', () => {
  expect(canCallToday()).toBe(true)
})

it('blocks after 200 calls', () => {
  for (let i = 0; i < 200; i += 1) consumeCall()
  expect(canCallToday()).toBe(false)
})

it('resets when the day changes', () => {
  for (let i = 0; i < 200; i += 1) consumeCall()
  expect(canCallToday()).toBe(false)

  vi.useFakeTimers()
  vi.setSystemTime(new Date(Date.now() + 24 * 60 * 60 * 1000))
  expect(canCallToday()).toBe(true)
})

it('stores quota as date and count', () => {
  consumeCall()
  const raw = JSON.parse(localStorage.getItem('dr:quota') ?? '{}') as { date: string; count: number }
  expect(raw.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  expect(raw.count).toBe(1)
})
