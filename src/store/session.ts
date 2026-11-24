import { create } from 'zustand'
import type { Portrait, Question, Report, Session, SessionConfig } from '../types'
import { hashText } from '../lib/hash'
import { truncateMaterial } from '../lib/truncate'
import { getSession, saveSession } from '../lib/storage'

export type SessionState = {
  session: Session | null
  mockNotice: boolean
  start(config: SessionConfig): void
  setMaterial(text: string, fileName?: string): Promise<void>
  setPortrait(portrait: Portrait): void
  begin(): void
  addQuestion(q: Question): void
  answerQuestion(id: string, answer: string, timeSpent: number): void
  evaluateQuestion(id: string, score: number, comment: string, modelAnswer: string): void
  finish(report: Report): void
  restore(id: string): void
  setMockNotice(v: boolean): void
  reset(): void
}

function newId(): string {
  return `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

export const useSessionStore = create<SessionState>((set, get) => {
  function commit(session: Session) {
    set({ session })
    if (session.status !== 'setup') saveSession(session)
  }

  return {
    session: null,
    mockNotice: false,

    start(config) {
      set({
        session: {
          id: newId(),
          createdAt: Date.now(),
          config,
          material: { text: '', chars: 0, hash: '' },
          messages: [],
          questions: [],
          status: 'setup',
        },
      })
    },

    async setMaterial(text, fileName) {
      const session = get().session
      if (!session) return
      const truncated = truncateMaterial(text)
      const hash = await hashText(truncated)
      commit({
        ...session,
        material: { fileName, text: truncated, chars: truncated.length, hash },
        status: 'ready',
      })
    },

    setPortrait(portrait) {
      const session = get().session
      if (!session) return
      commit({ ...session, portrait })
    },

    begin() {
      const session = get().session
      if (!session) return
      commit({ ...session, status: session.questions.length > 0 ? 'ongoing' : 'ready' })
    },

    addQuestion(question) {
      const session = get().session
      if (!session) return
      commit({ ...session, questions: [...session.questions, question], status: 'ongoing' })
    },

    answerQuestion(id, answer, timeSpent) {
      const session = get().session
      if (!session) return
      commit({
        ...session,
        questions: session.questions.map((item) =>
          item.id === id ? { ...item, answer, timeSpent } : item,
        ),
      })
    },

    evaluateQuestion(id, score, comment, modelAnswer) {
      const session = get().session
      if (!session) return
      commit({
        ...session,
        questions: session.questions.map((item) =>
          item.id === id ? { ...item, score, comment, modelAnswer } : item,
        ),
      })
    },

    finish(report) {
      const session = get().session
      if (!session) return
      commit({ ...session, report, status: 'finished' })
    },

    restore(id) {
      set({ session: getSession(id) ?? null })
    },

    setMockNotice(v) {
      set({ mockNotice: v })
    },

    reset() {
      set({ session: null, mockNotice: false })
    },
  }
})
