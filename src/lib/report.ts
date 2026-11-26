import type { QuestionReview, Report, ReportModelOutput, Session } from '../types'
import { levelOf, weightedTotal } from './scoring'

const DEFAULT_CHECKLIST = [
  '为每个核心结论准备一句可直接引用的证据或数据。',
  '把回答压缩成「结论—依据—局限」三段式，控制在 60 秒内。',
  '提前写好在被质疑时承认边界的说法，现场不硬拗。',
]

export function finalizeReport(output: ReportModelOutput, session: Session): Report {
  const byId = new Map(output.questionReviews.map((r) => [r.questionId, r]))

  const questions: QuestionReview[] = session.questions.map((q) => {
    const review = byId.get(q.id)
    const storedComment = q.comment && q.comment !== '暂无点评' ? q.comment : ''
    const storedAnswer = q.modelAnswer && q.modelAnswer !== '暂无参考话术' ? q.modelAnswer : ''
    return {
      questionId: q.id,
      question: q.text || review?.question || '',
      answer: q.answer || review?.answer || '',
      score: review?.score ?? q.score ?? 0,
      comment: storedComment || review?.comment || '暂无点评',
      modelAnswer: storedAnswer || review?.modelAnswer || '暂无参考话术',
    }
  })

  const total = weightedTotal(output.dimensions)

  // 模型有时把高危问题写成题目 id，这里还原成题目原文，避免报告里出现 q_xxx
  const questionTextById = new Map(session.questions.map((question) => [question.id, question.text]))
  const topRisks = output.topRisks
    .map((risk) => ({ ...risk, question: questionTextById.get(risk.question.trim()) ?? risk.question }))
    .slice(0, 5)

  return {
    total,
    level: levelOf(total),
    dimensions: output.dimensions,
    questions,
    topRisks,
    checklist: output.checklist.length > 0 ? output.checklist : DEFAULT_CHECKLIST,
    summary: output.summary,
    createdAt: Date.now(),
  }
}
