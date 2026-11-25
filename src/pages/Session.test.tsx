import { beforeEach, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Session as SessionType } from '../types'
import Session from './Session'
import { useSessionStore } from '../store/session'

const { navigateMock, runTaskMock } = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  runTaskMock: vi.fn(),
}))

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
  useParams: () => ({ id: 's_test' }),
}))

vi.mock('../lib/llm', () => ({ runTask: runTaskMock }))

const QUESTION = {
  judgeId: 'method',
  text: '你的样本量为什么是 30？',
  intent: '方法严谨性',
  suggestedSeconds: 90,
  followUpLevel: 0,
}

const EVALUATION = {
  score: 72,
  dimensions: { accuracy: 70, logic: 75, depth: 70, clarity: 75 },
  comment: '结论清楚，证据不足',
  modelAnswer: '样本量依据...',
  followUp: null,
}

const REPORT = {
  dimensions: { accuracy: 72, logic: 78, depth: 70, clarity: 80 },
  summary: '整体合格',
  checklist: ['补充样本量依据'],
  topRisks: [{ question: '样本量为什么是 30？', reason: '证据不足' }],
  questionReviews: [],
}

function buildSession(): SessionType {
  return {
    id: 's_test',
    createdAt: Date.now(),
    config: { type: 'master', discipline: 'stem', strictness: 'standard', minutes: 15 },
    material: { text: '本研究采用问卷法收集了 30 份样本。', chars: 18, hash: 'hash_test' },
    portrait: {
      topic: '样本量研究',
      problem: '样本是否足够',
      method: '问卷法',
      innovation: ['小样本校正'],
      evidence: ['30 份问卷'],
      limitations: ['样本量小'],
      keywords: ['样本量'],
    },
    messages: [],
    questions: [],
    status: 'ongoing',
  }
}

beforeEach(() => {
  navigateMock.mockClear()
  runTaskMock.mockReset()
  runTaskMock.mockImplementation(async (req: { task: string }) => {
    if (req.task === 'question') return { text: JSON.stringify(QUESTION), source: 'live' }
    if (req.task === 'evaluate') return { text: JSON.stringify(EVALUATION), source: 'live' }
    if (req.task === 'report') return { text: JSON.stringify(REPORT), source: 'live' }
    return { text: '回到材料的方法部分找依据。', source: 'live' }
  })
  localStorage.clear()
  useSessionStore.setState({ session: buildSession(), mockNotice: false })
})

it('asks a question, evaluates the answer and blocks short answers', async () => {
  const user = userEvent.setup()
  render(<Session />)

  expect(await screen.findByText('你的样本量为什么是 30？')).toBeInTheDocument()

  const input = screen.getByRole('textbox', { name: '回答' })
  await user.type(input, '因为 30 是经验值，符合问卷研究的通常做法{Enter}')

  expect(await screen.findByText(/结论清楚，证据不足/)).toBeInTheDocument()

  const callsBeforeShort = runTaskMock.mock.calls.length
  await user.type(input, '不知道{Enter}')

  expect(await screen.findByText('回答太短，请至少写 10 个字')).toBeInTheDocument()
  expect(runTaskMock.mock.calls.length).toBe(callsBeforeShort)
})

it('stops at the question target and can extend', async () => {
  const base = buildSession()
  useSessionStore.setState({
    session: { ...base, config: { ...base.config, questionTarget: 1 } },
    mockNotice: false,
  })
  const user = userEvent.setup()
  render(<Session />)

  expect(await screen.findByText('你的样本量为什么是 30？')).toBeInTheDocument()
  const input = screen.getByRole('textbox', { name: '回答' })
  await user.type(input, '因为 30 是经验值，符合问卷研究的通常做法{Enter}')

  expect(await screen.findByText(/结论清楚，证据不足/)).toBeInTheDocument()
  expect(await screen.findByText(/已达到本场目标题量/)).toBeInTheDocument()

  const questionCalls = () =>
    runTaskMock.mock.calls.filter((call) => (call[0] as { task: string }).task === 'question').length
  const before = questionCalls()

  await user.click(screen.getByRole('button', { name: '再加 1 题' }))

  await waitFor(() => expect(questionCalls()).toBe(before + 1))
  expect(useSessionStore.getState().session?.config.questionTarget).toBe(2)
})

it('finishes the session and navigates to the report', async () => {
  const user = userEvent.setup()
  render(<Session />)

  await screen.findByText('你的样本量为什么是 30？')
  await user.click(screen.getByRole('button', { name: '结束并出报告' }))

  await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/report/s_test'))
  expect(useSessionStore.getState().session?.report?.total).toBeTypeOf('number')
})
