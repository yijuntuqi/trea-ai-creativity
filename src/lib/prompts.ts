import type { SessionConfig } from '../types'
import { STRICTNESS_LABEL, disciplineLabel, typeLabel } from './labels'

export type LLMTask = 'portrait' | 'question' | 'evaluate' | 'hint' | 'report'

export type PromptSpec = {
  system: string
  user: string
  model: string
  maxTokens: number
  temperature: number
}

const MODEL_MAIN = 'qwen3.8-flash'
// 报告与主力模型保持一致：qwen3.8-plus 在当前 MaaS 工作区不存在，会返回 model_not_found
const MODEL_REPORT = 'qwen3.8-flash'

const MAX_TOKENS: Record<LLMTask, number> = {
  portrait: 2000,
  question: 700,
  evaluate: 1600,
  hint: 300,
  report: 6000,
}

const TEMPERATURE: Record<LLMTask, number> = {
  portrait: 0.4,
  question: 0.9,
  evaluate: 0.4,
  hint: 0.7,
  report: 0.3,
}

const JSON_RULE =
  '只输出一个 JSON 对象，不要使用代码围栏，不要输出任何解释文字；所有要求的字段都必须输出，不得省略。'

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
    .slice(-6)
    .map((item) => {
      const msg = item as { role?: string; text?: string }
      const speaker = msg.role === 'user' ? '学生' : '评委'
      return `${speaker}：${msg.text ?? ''}`
    })
  return lines.join('\n')
}

function scenario(payload: Record<string, unknown>): string {
  const config = payload.config as SessionConfig | undefined
  if (!config || typeof config !== 'object') return '（未提供）'
  const parts = [
    `答辩类型：${typeLabel(config)}`,
    `学科：${disciplineLabel(config)}`,
    `严格度：${STRICTNESS_LABEL[config.strictness] ?? config.strictness ?? 'standard'}`,
    `限时：${Number.isFinite(config.minutes) ? config.minutes : '未指定'} 分钟`,
  ]
  if (config.type === 'custom' && config.customType) {
    parts.push(`自定义场景说明：${config.customType}`)
  }
  if (config.discipline === 'other' && config.customDiscipline) {
    parts.push(`自定义学科说明：${config.customDiscipline}`)
  }
  return parts.join('；')
}

function systemFor(task: LLMTask): string {
  const base: Record<LLMTask, string> = {
    portrait:
      '你是一位论文答辩材料分析专家。只能依据给定材料提炼信息，材料中没有的信息不得编造；无法判断时写明「材料未提及」。' +
      TONE +
      JSON_RULE,
    question:
      '你是一位严格但公正的答辩评委，正在现场追问。问题必须紧扣材料与已答内容，避免重复已问过的问题，一次只问一个问题。' +
      '提问要能暴露回答中的证据缺口，并把答辩类型、学科、限时和严格度作为提问方式的依据。' +
      TONE +
      JSON_RULE,
    evaluate:
      '你是一位答辩评委，请依据材料原文评判选手回答。必须做到：' +
      '1）用「」引用选手回答中的原话，指出哪一句有依据、哪一句缺证据；' +
      '2）逐条列出缺失的证据、数据、逻辑跳跃或概念混淆，至少 3 条，每条一句话；' +
      '3）参考回答是一段可以直接照读的话术（120-260 字），必须包含材料中的具体事实、数据或方法名称，按「结论—依据—边界」组织；' +
      '4）禁止使用「回答方向正确，但证据不够具体」「建议补充数据」这类空泛套话；材料未提及的信息写「材料未提及」，不得编造。' +
      TONE +
      JSON_RULE,
    hint: '你是答辩教练，给选手一条简短提示，帮其回忆材料中的证据或换一个回答角度。只输出提示正文，不超过 80 字。' + TONE,
    report:
      '你是一位答辩评审组组长，负责汇总整场答辩的评分与复盘建议。必须做到：' +
      '1）评分有依据，扣分点与材料或回答对应；' +
      '2）逐题点评要对每一道题单独写，引用该题回答中的原话，指出具体缺口，不得所有题共用同一段话；' +
      '3）每道题的参考回答都必须结合材料写出可照读的话术（不少于 100 字）；' +
      '4）禁止套话模板，材料未提及的信息写「材料未提及」。' +
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
        `【答辩场景】${scenario(payload)}`,
        `【材料原文】\n${material}`,
        '输出字段：topic（题目）、problem（研究问题）、method（研究方法）、innovation（创新点数组）、evidence（证据数组）、limitations（局限数组）、keywords（关键词数组）。',
      ].join('\n\n')
    case 'question':
      return [
        '请基于以下信息提出下一个答辩问题。',
        `【答辩场景】${scenario(payload)}`,
        `【本场进度】第 ${asText(payload.questionIndex ?? 1)} 题 / 计划 ${asText(payload.questionTotal ?? '未指定')} 题`,
        `【材料要点】\n${material}`,
        `【选手画像】\n${asText(payload.portrait) || '（未提供）'}`,
        `【最近对话】\n${recentTurns(payload)}`,
        `【严格度】${asText(payload.strictness) || 'standard'}`,
        `【本轮评委】${asText(payload.judge) || 'method'}`,
        `【可参与评委】${asText(payload.judges) || 'method|innovation|application'}`,
        '输出字段：judgeId（必须是可参与评委之一）、text（问题）、intent（考察意图）、suggestedSeconds（建议秒数）。',
      ].join('\n\n')
    case 'evaluate':
      return [
        '请点评选手对当前问题的回答。',
        `【答辩场景】${scenario(payload)}`,
        `【选手画像】\n${asText(payload.portrait) || '（未提供）'}`,
        `【当前问题】\n${asText(payload.question)}`,
        `【选手回答】\n${asText(payload.answer)}`,
        `【材料要点】\n${material}`,
        '输出字段：score（0-100 整数）、dimensions（accuracy/logic/depth/clarity，各 0-100）、comment（点评，用「」引用回答原话，分点列出至少 3 处具体缺口）、modelAnswer（可直接照读的参考回答，120-260 字）、followUp（可继续追问的一句）。',
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
        `【答辩场景】${scenario(payload)}`,
        `【材料要点】\n${material}`,
        `【选手画像】\n${asText(payload.portrait) || '（未提供）'}`,
        `【问答记录】\n${asText(payload.questions) || '（未提供）'}`,
        '输出字段：dimensions（accuracy/logic/depth/clarity，各 0-100）、summary（整体评语，80-150 字，点出最关键的 2 个问题）、checklist（答辩准备清单数组，4-6 条，每条可执行）、topRisks（[{question,reason}]）、questionReviews（[{questionId,question,answer,score,comment,modelAnswer}]，必须覆盖每一题，且逐题内容不得重复）。',
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
