import { beforeEach, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Session } from '../types'
import History from './History'
import { loadSessions, saveSession } from '../lib/storage'

const { navigateMock } = vi.hoisted(() => ({ navigateMock: vi.fn() }))

vi.mock('react-router-dom', () => ({ useNavigate: () => navigateMock }))

function finishedSession(): Session {
  return {
    id: 's_a',
    createdAt: Date.parse('2026-11-21T10:00:00+08:00'),
    config: { type: 'undergrad', discipline: 'stem', strictness: 'standard', minutes: 15 },
    material: { fileName: '论文.pdf', text: '材料', chars: 2, hash: 'h_a' },
    messages: [],
    questions: [],
    status: 'finished',
    report: {
      total: 85,
      level: '优秀',
      dimensions: { accuracy: 86, logic: 84, depth: 84, clarity: 86 },
      questions: [],
      topRisks: [],
      checklist: [],
      summary: '很好',
      createdAt: Date.parse('2026-11-21T10:30:00+08:00'),
    },
  }
}

function ongoingSession(): Session {
  return {
    id: 's_b',
    createdAt: Date.parse('2026-11-22T10:00:00+08:00'),
    config: { type: 'project', discipline: 'stem', strictness: 'press', minutes: 25 },
    material: { fileName: '项目汇报.pptx', text: '材料', chars: 2, hash: 'h_b' },
    messages: [],
    questions: [],
    status: 'ongoing',
  }
}

beforeEach(() => {
  navigateMock.mockClear()
  localStorage.clear()
  saveSession(finishedSession())
  saveSession(ongoingSession())
})

it('lists sessions and opens a report', async () => {
  const user = userEvent.setup()
  render(<History />)

  expect(screen.getAllByRole('listitem')).toHaveLength(2)
  expect(screen.getByText('85 分 · 优秀')).toBeInTheDocument()
  expect(screen.getByText('进行中')).toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: '查看报告' }))
  expect(navigateMock).toHaveBeenCalledWith('/report/s_a')
})

it('deletes a session from the list and storage', async () => {
  const user = userEvent.setup()
  render(<History />)

  const before = loadSessions().length
  await user.click(screen.getAllByRole('button', { name: '删除' })[0])

  await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(before - 1))
  expect(loadSessions()).toHaveLength(before - 1)
})

it('shows an empty state without sessions', () => {
  localStorage.clear()
  render(<History />)
  expect(screen.getByText('还没有预演记录')).toBeInTheDocument()
})
