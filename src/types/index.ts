export type Strictness = 'gentle' | 'standard' | 'press'

export type DefenseType = 'undergrad' | 'master' | 'project' | 'course' | 'custom'

export type Discipline = 'stem' | 'humanities' | 'business' | 'medicine' | 'art' | 'other'

export type SessionConfig = {
  type: DefenseType
  discipline: Discipline
  strictness: Strictness
  minutes: number
  questionTarget?: number
  judges?: JudgeId[]
  customType?: string
  customDiscipline?: string
}

export type Material = {
  fileName?: string
  text: string
  chars: number
  hash: string
}

export type Portrait = {
  topic: string
  problem: string
  method: string
  innovation: string[]
  evidence: string[]
  limitations: string[]
  keywords: string[]
}

export type JudgeId = 'method' | 'innovation' | 'application'

export type Judge = {
  id: JudgeId
  name: string
  focus: string
  style: string
  color: string
  avatar: string
}

export type Question = {
  id: string
  judgeId: JudgeId
  text: string
  intent: string
  suggestedSeconds: number
  followUpLevel: 0 | 1 | 2
  answer?: string
  timeSpent?: number
  score?: number
  comment?: string
  modelAnswer?: string
}

export type Message = {
  id: string
  role: 'judge' | 'user' | 'system'
  judgeId?: JudgeId
  text: string
  createdAt: number
}

export type DimensionScores = {
  accuracy: number
  logic: number
  depth: number
  clarity: number
}

export type QuestionReview = {
  questionId: string
  question: string
  answer: string
  score: number
  comment: string
  modelAnswer: string
}

export type RiskItem = {
  question: string
  reason: string
}

export type Report = {
  total: number
  level: '优秀' | '良好' | '待改进'
  dimensions: DimensionScores
  questions: QuestionReview[]
  topRisks: RiskItem[]
  checklist: string[]
  summary: string
  createdAt: number
}

export type Session = {
  id: string
  createdAt: number
  updatedAt?: number
  retryFrom?: { id: string; createdAt: number }
  config: SessionConfig
  material: Material
  portrait?: Portrait
  messages: Message[]
  questions: Question[]
  report?: Report
  status: 'setup' | 'ready' | 'ongoing' | 'finished'
}

export type ReportModelOutput = {
  dimensions: DimensionScores
  summary: string
  checklist: string[]
  topRisks: RiskItem[]
  questionReviews: QuestionReview[]
}
