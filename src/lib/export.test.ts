import { expect, it } from 'vitest'
import type { Session } from '../types'
import { reportToDocHtml, reportToMarkdown } from './export'

const questions = Array.from({ length: 6 }, (_, index) => ({
  id: `q${index + 1}`,
  judgeId: 'method' as const,
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
  id: 's_export',
  createdAt: 1_700_000_000_000,
  config: { type: 'master', discipline: 'stem', strictness: 'standard', minutes: 15 },
  material: { text: '材料', chars: 2, hash: 'h', fileName: '论文.pdf' },
  messages: [],
  questions,
  status: 'finished',
  report: {
    total: 82,
    level: '良好',
    dimensions: { accuracy: 84, logic: 80, depth: 78, clarity: 86 },
    questions: questions.map((q) => ({
      questionId: q.id,
      question: q.text,
      answer: q.answer,
      score: q.score,
      comment: q.comment,
      modelAnswer: q.modelAnswer,
    })),
    topRisks: [{ question: '样本代表性？', reason: '未说明抽样' }],
    checklist: ['补充样本量依据'],
    summary: '结构完整，证据密度需要加强。',
    createdAt: 1_700_000_000_000,
  },
}

it('markdown includes every question review by default', () => {
  const md = reportToMarkdown(session)
  expect(md).toContain('# 答辩预演报告')
  expect(md).toContain('总分：82 分（良好）')
  expect(md).toContain('## 逐题点评')
  for (let i = 1; i <= 6; i++) {
    expect(md).toContain(`第 ${i} 题 · 问题 ${i}`)
    expect(md).toContain(`点评 ${i}`)
  }
  expect(md).toContain('补充样本量依据')
})

it('doc html includes every question review and escapes text', () => {
  const html = reportToDocHtml({
    ...session,
    report: {
      ...session.report!,
      questions: [
        {
          questionId: 'q1',
          question: '问题 <1>',
          answer: 'A & B',
          score: 80,
          comment: '点评',
          modelAnswer: '参考',
        },
      ],
    },
  })
  expect(html).toContain('<title>答辩预演报告</title>')
  expect(html).toContain('问题 &lt;1&gt;')
  expect(html).toContain('A &amp; B')
  expect(html).toContain('逐题点评')
})
