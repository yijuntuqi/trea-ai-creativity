import { expect, it } from 'vitest'
import type { Session } from '../types'
import { mergeSessions } from './cloud'

function makeSession(id: string, createdAt: number, updatedAt?: number, tag = ''): Session {
  return {
    id,
    createdAt,
    updatedAt,
    config: { type: 'master', discipline: 'stem', strictness: 'standard', minutes: 15 },
    material: { text: `材料${tag}`, chars: 2, hash: `h_${tag}` },
    messages: [],
    questions: [],
    status: 'ready',
  }
}

it('unions local and cloud sessions, newest first', () => {
  const merged = mergeSessions(
    [makeSession('local', 3000, undefined, 'local')],
    [makeSession('cloud', 2000, undefined, 'cloud')],
  )
  expect(merged.map((session) => session.id)).toEqual(['local', 'cloud'])
})

it('keeps the more recently updated copy of the same session', () => {
  const merged = mergeSessions(
    [makeSession('same', 1000, 5000, 'local')],
    [makeSession('same', 1000, 4000, 'cloud')],
  )
  expect(merged).toHaveLength(1)
  expect(merged[0].material.hash).toBe('h_local')

  const remoteNewer = mergeSessions(
    [makeSession('same', 1000, 3000, 'local')],
    [makeSession('same', 1000, 9000, 'cloud')],
  )
  expect(remoteNewer[0].material.hash).toBe('h_cloud')
})

it('falls back to createdAt when updatedAt is missing', () => {
  const merged = mergeSessions(
    [makeSession('same', 7000, undefined, 'local')],
    [makeSession('same', 1000, undefined, 'cloud')],
  )
  expect(merged[0].material.hash).toBe('h_local')
})
