import type { ReactNode } from 'react'
import { beforeEach, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Session } from '../types'
import Report from './Report'
import { saveSession } from '../lib/storage'

const { navigateMock, toPngMock } = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  toPngMock: vi.fn(),
}))

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
  useParams: () => ({ id: 's_report' }),
}))

vi.mock('recharts', () => {
  const Chart = ({ children }: { children?: ReactNode }) => <div>{children}</div>
  return {
    ResponsiveContainer: Chart,
    RadarChart: Chart,
    PolarGrid: () => null,
    PolarAngleAxis: () => null,
    PolarRadiusAxis: () => null,
    Radar: () => null,
  }
})

vi.mock('html-to-image', () => ({ toPng: toPngMock }))

const questions = Array.from({ length: 6 }, (_, index) => ({
  id: `q${index + 1}`,
  judgeId: (['method', 'innovation', 'application'] as const)[index % 3],
  text: `问题 ${index + 1}`,
  intent: '考察点',
  suggestedSeconds: 90,
  followUpLevel: 0 as const,
  answer: `回答 ${index + 1}`,
  score: 80 + index,
  comment: `点评 ${index + 1}`,
  modelAnswer: '参考回答',
}))

const session: Session = {
  id: 's_report',
  createdAt: Date.now(),
  config: { type: 'master', discipline: 'stem', strictness: 'standard', minutes: 15 },
  material: { text: '材料', chars: 2, hash: 'hash_report' },
  messages: [],
  questions,
  status: 'finished',
  report: {
    total: 82,
    level: '良好',
    dimensions: { accuracy: 84, logic: 80, depth: 78, clarity: 86 },
    questions: questions.map((question) => ({
      questionId: question.id,
      question: question.text,
      answer: question.answer,
      score: question.score,
      comment: question.comment,
      modelAnswer: question.modelAnswer,
    })),
    topRisks: [{ question: '样本代表性如何保证？', reason: '材料未说明抽样方式' }],
    checklist: ['补充样本量依据', '准备失败案例分析'],
    summary: '整体结构完整，证据密度需要加强。',
    createdAt: Date.now(),
  },
}

beforeEach(() => {
  navigateMock.mockClear()
  toPngMock.mockReset()
  toPngMock.mockResolvedValue('data:image/png;base64,stub')
  localStorage.clear()
  saveSession(session)
})

it('renders scores, risks, reviews and exports an image', async () => {
  const user = userEvent.setup()
  render(<Report />)

  expect(screen.getByText('82')).toBeInTheDocument()
  expect(screen.getByText('良好')).toBeInTheDocument()
  expect(screen.getByText('高危问题 Top 5')).toBeInTheDocument()
  expect(screen.getByText('复盘清单')).toBeInTheDocument()
  expect(screen.getAllByText(/点评：点评 \d/)).toHaveLength(6)

  await user.click(screen.getByRole('button', { name: '保存报告图片' }))
  expect(toPngMock).toHaveBeenCalledTimes(1)
})
