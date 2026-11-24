import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useElapsedTimer } from './useElapsedTimer'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

it('increments while running', () => {
  const { result } = renderHook(() => useElapsedTimer(true))
  act(() => {
    vi.advanceTimersByTime(3000)
  })
  expect(result.current.seconds).toBe(3)
})

it('resets to zero', () => {
  const { result } = renderHook(() => useElapsedTimer(true))
  act(() => {
    vi.advanceTimersByTime(2000)
  })
  act(() => {
    result.current.reset()
  })
  expect(result.current.seconds).toBe(0)
})

it('does not increment when paused', () => {
  const { result, rerender } = renderHook(({ running }) => useElapsedTimer(running), {
    initialProps: { running: true },
  })
  act(() => {
    vi.advanceTimersByTime(2000)
  })
  rerender({ running: false })
  act(() => {
    vi.advanceTimersByTime(2000)
  })
  expect(result.current.seconds).toBe(2)
})
