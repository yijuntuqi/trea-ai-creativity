import { beforeEach, expect, it } from 'vitest'
import { clearSessions, deleteSession, getSession, loadSessions, saveSession } from './storage'
import type { Session } from '../types'

function makeSession(id: string, createdAt: number): Session {
  return {
    id,
    createdAt,
    config: { type: 'master', discipline: 'stem', strictness: 'standard', minutes: 15 },
    material: { text: '材料', chars: 2, hash: 'h' },
    messages: [],
    questions: [],
    status: 'ready',
  }
}

beforeEach(() => {
  localStorage.clear()
})

it('returns empty list on empty storage', () => {
  expect(loadSessions()).toEqual([])
})

it('saves and reads a session by id', () => {
  saveSession(makeSession('a', 1))
  expect(getSession('a')?.id).toBe('a')
})

it('keeps 20 newest sessions, newest first', () => {
  for (let i = 0; i < 21; i += 1) saveSession(makeSession(`s${i}`, i))
  const list = loadSessions()
  expect(list).toHaveLength(20)
  expect(list[0].id).toBe('s20')
  expect(list.some((s) => s.id === 's0')).toBe(false)
})

it('deletes one session and clears all', () => {
  saveSession(makeSession('a', 1))
  saveSession(makeSession('b', 2))
  deleteSession('a')
  expect(loadSessions().map((s) => s.id)).toEqual(['b'])
  clearSessions()
  expect(loadSessions()).toEqual([])
})

it('survives corrupted json', () => {
  localStorage.setItem('dr:sessions', '{broken')
  expect(loadSessions()).toEqual([])
})
