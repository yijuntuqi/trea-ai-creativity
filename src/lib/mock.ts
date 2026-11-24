import type { LLMTask } from './prompts'

const MOCK_PORTRAIT = {
  topic: '基于深度学习的中文文本情感分析研究',
  problem: '现有模型在长文本与网络用语场景下情感极性判断不稳定。',
  method: '构建 1.2 万条标注语料，对比 BERT 与 LSTM 基线模型。',
  innovation: ['引入网络用语归一化预处理', '设计长度自适应注意力机制'],
  evidence: ['测试集 F1 提升 4.3%', '消融实验验证各模块贡献'],
  limitations: ['语料领域覆盖有限', '未做线上部署验证'],
  keywords: ['情感分析', '深度学习', '注意力机制'],
}

const MOCK_QUESTIONS: Record<string, string> = {
  method: '你提到对比了 BERT 与 LSTM，能否说明两组实验在数据划分和超参数上是否完全一致？',
  innovation: '你的长度自适应注意力机制与已有工作相比，差异具体体现在哪里？',
  application: '如果要把这套方法部署到真实业务，你预计最大的工程障碍是什么？',
}

const MOCK_INTENTS: Record<string, string> = {
  method: '考察实验设计的可控性与严谨度',
  innovation: '考察创新点与已有工作的边界',
  application: '考察落地成本与真实需求判断',
}

export function mockTask(task: LLMTask, payload: Record<string, unknown>): string {
  switch (task) {
    case 'portrait':
      return JSON.stringify(MOCK_PORTRAIT)
    case 'question': {
      const judgeId =
        typeof payload.judge === 'string' && payload.judge in MOCK_QUESTIONS
          ? (payload.judge as string)
          : 'method'
      const followUpLevel = Number(payload.followUpLevel ?? 0)
      return JSON.stringify({
        judgeId,
        text: MOCK_QUESTIONS[judgeId],
        intent: MOCK_INTENTS[judgeId],
        suggestedSeconds: followUpLevel > 0 ? 60 : 90,
        followUpLevel,
      })
    }
    case 'evaluate':
      return JSON.stringify({
        score: 76,
        dimensions: { accuracy: 78, logic: 74, depth: 70, clarity: 82 },
        comment:
          '回答覆盖了核心做法，但缺少具体数据支撑，对实验条件的一致性问题只做了笼统说明。建议补充样本量与划分方式。',
        modelAnswer:
          '两组实验使用同一份训练/验证/测试划分，随机种子固定；学习率与批大小在验证集上分别调优，其余超参数保持一致，以保证对比公平。',
        followUp: '那你在调超参数时，如何避免验证集信息泄漏到测试集？',
      })
    case 'hint':
      return '提示：回到材料的「方法」部分，先说明样本来源与划分方式，再给出关键指标数据。'
    case 'report': {
      const questions = Array.isArray(payload.questions) ? payload.questions : []
      const questionReviews = questions.map((item, index) => {
        const question = item as { id?: string; text?: string; answer?: string }
        return {
          questionId: question.id ?? `q${index + 1}`,
          question: question.text ?? '（问题记录缺失）',
          answer: question.answer ?? '',
          score: 75,
          comment: '回答方向正确，但证据不够具体，建议补充数据与边界条件。',
          modelAnswer: '先给结论，再给依据（数据/文献），最后说明适用边界。',
        }
      })
      return JSON.stringify({
        dimensions: { accuracy: 78, logic: 75, depth: 72, clarity: 80 },
        summary:
          '整体结构完整，主线清晰；主要短板在于证据密度不足，对方法与创新点的边界说明偏薄弱。按报告中的高风险问题逐条补齐，可明显提升答辩表现。',
        checklist: [
          '为每个创新点准备一条与基线方法的量化对比',
          '复述样本来源、样本量与抽样方式',
          '准备 2 个失败案例及原因分析',
          '练习在 90 秒内回答核心问题',
        ],
        topRisks: [
          { question: '样本代表性如何保证？', reason: '材料未说明抽样方式与数据来源限制。' },
          { question: '创新点与已有工作的差异是什么？', reason: '缺少与最相关工作的直接对比。' },
        ],
        questionReviews,
      })
    }
  }
}
