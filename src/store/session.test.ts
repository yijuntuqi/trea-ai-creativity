import { beforeEach, expect, it } from 'vitest'
import { useSessionStore } from './session'
import { getSession } from '../lib/storage'

const config = { type: 'master', discipline: 'stem', strictness: 'standard', minutes: 15 } as const

beforeEach(() => {
  localStorage.clear()
  useSessionStore.getState().reset()
})

it('starts a setup session', () => {
  useSessionStore.getState().start(config)
  const session = useSessionStore.getState().session
  expect(session).not.toBeNull()
  expect(session?.id.length).toBeGreaterThan(0)
  expect(session?.status).toBe('setup')
})

it('sets material with hash and ready status', async () => {
  useSessionStore.getState().start(config)
  await useSessionStore.getState().setMaterial('材料', 'a.pdf')
  const session = useSessionStore.getState().session
  expect(session?.material.chars).toBe(2)
  expect(session?.material.hash).not.toBe('')
  expect(session?.material.fileName).toBe('a.pdf')
  expect(session?.status).toBe('ready')
})

it('moves to ongoing and persists on finish', () => {
  useSessionStore.getState().start(config)
  useSessionStore.getState().addQuestion({
    id: 'q1',
    judgeId: 'method',
    text: '问题',
    intent: '意图',
    suggestedSeconds: 90,
    followUpLevel: 0,
  })
  expect(useSessionStore.getState().session?.status).toBe('ongoing')
  expect(useSessionStore.getState().session?.questions).toHaveLength(1)

  const id = useSessionStore.getState().session?.id ?? ''
  useSessionStore.getState().finish({
    total: 80,
    level: '良好',
    dimensions: { accuracy: 80, logic: 80, depth: 80, clarity: 80 },
    questions: [],
    topRisks: [],
    checklist: [],
    summary: '整体稳定',
    createdAt: Date.now(),
  })
  expect(useSessionStore.getState().session?.status).toBe('finished')
  expect(getSession(id)?.status).toBe('finished')
})

it('updates config for target and judges', () => {
  useSessionStore.getState().start(config)
  useSessionStore.getState().updateConfig({ questionTarget: 8, judges: ['innovation'] })
  expect(useSessionStore.getState().session?.config).toMatchObject({
    questionTarget: 8,
    judges: ['innovation'],
  })
})

it('starts a retry copy and keeps the original session', async () => {
  useSessionStore.getState().start(config)
  await useSessionStore.getState().setMaterial('原材料', 'old.pdf')
  const originalId = useSessionStore.getState().session?.id ?? ''
  useSessionStore.getState().addQuestion({
    id: 'q1',
    judgeId: 'method',
    text: '问题',
    intent: '意图',
    suggestedSeconds: 90,
    followUpLevel: 0,
  })
  const source = useSessionStore.getState().session
  expect(source).not.toBeNull()
  if (!source) return

  useSessionStore.getState().startRetry(source)

  const retry = useSessionStore.getState().session
  expect(retry?.id).not.toBe(originalId)
  expect(retry?.status).toBe('ready')
  expect(retry?.material.text).toBe('原材料')
  expect(retry?.questions).toEqual([])
  expect(retry?.messages).toEqual([])
  expect(retry?.report).toBeUndefined()
  expect(getSession(originalId)?.questions).toHaveLength(1)
})

it('restores a saved session by id', () => {
  useSessionStore.getState().start(config)
  const id = useSessionStore.getState().session?.id ?? ''
  useSessionStore.getState().finish({
    total: 70,
    level: '良好',
    dimensions: { accuracy: 70, logic: 70, depth: 70, clarity: 70 },
    questions: [],
    topRisks: [],
    checklist: [],
    summary: '一般',
    createdAt: Date.now(),
  })

  useSessionStore.getState().reset()
  expect(useSessionStore.getState().session).toBeNull()

  useSessionStore.getState().restore(id)
  expect(useSessionStore.getState().session?.id).toBe(id)
})
