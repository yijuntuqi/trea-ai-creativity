import type { DefenseType, Discipline, JudgeId, SessionConfig, Strictness } from '../types'

export type SelectOption<T extends string> = { value: T; label: string }

export const DEFENSE_TYPE_OPTIONS: SelectOption<DefenseType>[] = [
  { value: 'undergrad', label: '本科毕业答辩' },
  { value: 'master', label: '硕博学位答辩' },
  { value: 'project', label: '项目结题答辩' },
  { value: 'course', label: '课程汇报' },
  { value: 'custom', label: '自定义' },
]

const DEFENSE_TYPE_LABEL: Record<DefenseType, string> = {
  undergrad: '本科毕业答辩',
  master: '硕博学位答辩',
  project: '项目结题答辩',
  course: '课程汇报',
  custom: '自定义答辩',
}

export const DISCIPLINE_OPTIONS: SelectOption<Discipline>[] = [
  { value: 'stem', label: '理工' },
  { value: 'humanities', label: '人文社科' },
  { value: 'business', label: '经管' },
  { value: 'medicine', label: '医学' },
  { value: 'art', label: '艺术设计' },
  { value: 'other', label: '其他' },
]

const DISCIPLINE_LABEL: Record<Discipline, string> = {
  stem: '理工',
  humanities: '人文社科',
  business: '经管',
  medicine: '医学',
  art: '艺术设计',
  other: '其他学科',
}

export const STRICTNESS_OPTIONS: SelectOption<Strictness>[] = [
  { value: 'gentle', label: '温和（鼓励为主）' },
  { value: 'standard', label: '标准' },
  { value: 'press', label: '压力（连续追问）' },
]

export const STRICTNESS_LABEL: Record<Strictness, string> = {
  gentle: '温和（鼓励为主）',
  standard: '标准',
  press: '压力（连续追问）',
}

export const STRICTNESS_SHORT: Record<Strictness, string> = {
  gentle: '温和',
  standard: '标准',
  press: '压力',
}

export function typeLabel(config: SessionConfig): string {
  if (config.type === 'custom') return config.customType?.trim() || DEFENSE_TYPE_LABEL.custom
  return DEFENSE_TYPE_LABEL[config.type] ?? DEFENSE_TYPE_LABEL.custom
}

export function disciplineLabel(config: SessionConfig): string {
  if (config.discipline === 'other') return config.customDiscipline?.trim() || DISCIPLINE_LABEL.other
  return DISCIPLINE_LABEL[config.discipline] ?? DISCIPLINE_LABEL.other
}

export const ALL_JUDGES: JudgeId[] = ['method', 'innovation', 'application']

export const JUDGE_OPTIONS: SelectOption<JudgeId>[] = [
  { value: 'method', label: '方法论派 · 严谨型' },
  { value: 'innovation', label: '创新性质疑派 · 犀利型' },
  { value: 'application', label: '应用价值派 · 务实型' },
]

export const DEFAULT_QUESTION_TARGET = 6
export const MIN_QUESTION_TARGET = 1
export const MAX_QUESTION_TARGET = 30
export const QUESTION_TARGET_PRESETS = [4, 6, 8, 10]

export function targetOf(config: SessionConfig): number {
  const value = Number(config.questionTarget)
  if (!Number.isFinite(value)) return DEFAULT_QUESTION_TARGET
  return Math.max(MIN_QUESTION_TARGET, Math.min(MAX_QUESTION_TARGET, Math.round(value)))
}

export function judgesOf(config: SessionConfig): JudgeId[] {
  const picked = (config.judges ?? []).filter((id): id is JudgeId => ALL_JUDGES.includes(id))
  return picked.length > 0 ? Array.from(new Set(picked)) : ALL_JUDGES
}
