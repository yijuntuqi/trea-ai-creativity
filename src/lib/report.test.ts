import { finalizeReport } from './report'
import { levelOf, weightedTotal } from './scoring'
import type { Question, ReportModelOutput, Session } from '../types'

function makeSession(): Session {
  const questions: Question[] = Array.from({ length: 6 }, (_, i) => ({
    id: `q${i + 1}`,
    judgeId: 'method',
    text: `问题 ${i + 1}`,
    intent: '考察方法严谨性',
    suggestedSeconds: 90,
    followUpLevel: 0,
    answer: `回答 ${i + 1}`,
    score: 70 + i,
    comment: `点评 ${i + 1}`,
    modelAnswer: `参考话术 ${i + 1}`,
  }))

  return {
    id: 's1',
    createdAt: 1,
    config: { type: 'undergrad', discipline: 'stem', strictness: 'standard', minutes: 8 },
    material: { text: '材料', chars: 2, hash: 'abc' },
    messages: [],
    questions,
    status: 'ongoing',
  }
}

it('finalizes report with local totals and filled reviews', () => {
  const output: ReportModelOutput = {
    dimensions: { accuracy: 80, logic: 85, depth: 75, clarity: 90 },
    summary: '整体合格',
    checklist: [],
    topRisks: Array.from({ length: 7 }, (_, i) => ({
      question: `风险 ${i}`,
      reason: '证据不足',
    })),
    questionReviews: [],
  }

  const report = finalizeReport(output, makeSession())

  expect(report.total).toBe(weightedTotal(output.dimensions))
  expect(report.level).toBe(levelOf(report.total))
  expect(report.topRisks).toHaveLength(5)
  expect(report.checklist.length).toBeGreaterThanOrEqual(3)
  expect(report.questions).toHaveLength(6)
  expect(typeof report.createdAt).toBe('number')
})

it('prefers model reviews when present', () => {
  const session = makeSession()
  const output: ReportModelOutput = {
    dimensions: { accuracy: 90, logic: 90, depth: 90, clarity: 90 },
    summary: '表现优秀',
    checklist: ['保持'],
    topRisks: [],
    questionReviews: [
      {
        questionId: 'q1',
        question: '问题 1',
        answer: '回答 1',
        score: 95,
        comment: '模型点评',
        modelAnswer: '模型参考',
      },
    ],
  }

  const report = finalizeReport(output, session)

  expect(report.questions[0].score).toBe(95)
  expect(report.questions[0].comment).toBe('模型点评')
  expect(report.questions[1].score).toBe(71)
  expect(report.questions[1].comment).toBe('点评 2')
  expect(report.total).toBe(90)
  expect(report.level).toBe('优秀')
})
