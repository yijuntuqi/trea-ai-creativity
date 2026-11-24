export type LLMTask = 'portrait' | 'question' | 'evaluate' | 'hint' | 'report'

export type PromptSpec = {
  system: string
  user: string
  model: string
  maxTokens: number
  temperature: number
}

const MODEL_MAIN = 'qwen3.8-flash'
const MODEL_REPORT = 'qwen3.8-plus'

const MAX_TOKENS: Record<LLMTask, number> = {
  portrait: 900,
  question: 300,
  evaluate: 400,
  hint: 200,
  report: 1500,
}

const TEMPERATURE: Record<LLMTask, number> = {
  portrait: 0.4,
  question: 0.9,
  evaluate: 0.3,
  hint: 0.7,
  report: 0.3,
}

const JSON_RULE = '只输出一个 JSON 对象，不要使用代码围栏，不要输出任何解释文字。'

const TONE = '使用中文，评委口吻专业、克制、具体，不要客套开场白。'

function asText(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'string') return value
  return JSON.stringify(value, null, 2)
}

function recentTurns(payload: Record<string, unknown>): string {
  const raw = payload.recentMessages ?? payload.messages
  if (!Array.isArray(raw) || raw.length === 0) return '（本轮为第一个问题）'
  const lines = raw
    .slice(-3)
    .map((item) => {
      const msg = item as { role?: string; text?: string }
      const speaker = msg.role === 'user' ? '学生' : '评委'
      return `${speaker}：${msg.text ?? ''}`
    })
  return lines.join('\n')
}

function systemFor(task: LLMTask): string {
  const base: Record<LLMTask, string> = {
    portrait:
      '你是一位论文答辩材料分析专家。只能依据给定材料提炼信息，材料中没有的信息不得编造；无法判断时写明「材料未提及」。' +
      TONE +
      JSON_RULE,
    question:
      '你是一位严格但公正的答辩评委，正在现场追问。问题必须紧扣材料与已答内容，避免重复已问过的问题，一次只问一个问题。' +
      TONE +
      JSON_RULE,
    evaluate:
      '你是一位答辩评委，请依据材料原文评判选手回答，指出缺失的证据与逻辑漏洞，并给出一段可直接背诵的参考回答。' +
      TONE +
      JSON_RULE,
    hint: '你是答辩教练，给选手一条简短提示，帮其回忆材料中的证据或换一个回答角度。只输出提示正文，不超过 80 字。' + TONE,
    report:
      '你是一位答辩评审组组长，负责汇总整场答辩的评分与复盘建议。评分必须有依据，建议必须可执行。' +
      TONE +
      JSON_RULE,
  }
  return base[task]
}

function userFor(task: LLMTask, payload: Record<string, unknown>): string {
  const material = asText(payload.material) || '（未提供材料）'
  switch (task) {
    case 'portrait':
      return [
        '请从以下答辩材料中提炼结构化画像。',
        `【答辩配置】${asText(payload.config) || '（未提供）'}`,
        `【材料原文】\n${material}`,
        '输出字段：topic（题目）、problem（研究问题）、method（研究方法）、innovation（创新点数组）、evidence（证据数组）、limitations（局限数组）、keywords（关键词数组）。',
      ].join('\n\n')
    case 'question':
      return [
        '请基于以下信息提出下一个答辩问题。',
        `【材料要点】\n${material}`,
        `【选手画像】\n${asText(payload.portrait) || '（未提供）'}`,
        `【最近对话】\n${recentTurns(payload)}`,
        `【严格度】${asText(payload.strictness) || 'standard'}`,
        `【追问层级】${asText(payload.followUpLevel ?? 0)}`,
        `【本轮评委】${asText(payload.judge) || 'method'}`,
        '输出字段：judgeId（method|innovation|application）、text（问题）、intent（考察意图）、suggestedSeconds（建议秒数）、followUpLevel（0|1|2）。',
      ].join('\n\n')
    case 'evaluate':
      return [
        '请点评选手对当前问题的回答。',
        `【当前问题】\n${asText(payload.question)}`,
        `【选手回答】\n${asText(payload.answer)}`,
        `【材料要点】\n${material}`,
        '输出字段：score（0-100 整数）、dimensions（accuracy/logic/depth/clarity，各 0-100）、comment（点评）、modelAnswer（参考回答）、followUp（可继续追问的一句）。',
      ].join('\n\n')
    case 'hint':
      return [
        `【当前问题】\n${asText(payload.question)}`,
        `【选手已写】\n${asText(payload.answer) || '（尚未作答）'}`,
        `【材料要点】\n${material}`,
        '请给一条不超过 80 字的提示。',
      ].join('\n\n')
    case 'report':
      return [
        '请汇总整场答辩并生成复盘报告。',
        `【材料要点】\n${material}`,
        `【选手画像】\n${asText(payload.portrait) || '（未提供）'}`,
        `【问答记录】\n${asText(payload.questions) || '（未提供）'}`,
        '输出字段：dimensions（accuracy/logic/depth/clarity，各 0-100）、summary（整体评语）、checklist（答辩准备清单数组）、topRisks（[{question,reason}]）、questionReviews（[{questionId,question,answer,score,comment,modelAnswer}]）。',
      ].join('\n\n')
  }
}

export function buildPrompt(task: LLMTask, payload: Record<string, unknown>): PromptSpec {
  return {
    system: systemFor(task),
    user: userFor(task, payload),
    model: task === 'report' ? MODEL_REPORT : MODEL_MAIN,
    maxTokens: MAX_TOKENS[task],
    temperature: TEMPERATURE[task],
  }
}
