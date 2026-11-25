import { create } from 'zustand'
import type { Message, Portrait, Question, Report, Session, SessionConfig } from '../types'
import { hashText } from '../lib/hash'
import { normalizeMaterial } from '../lib/material'
import { getSession, saveSession } from '../lib/storage'

export type SessionState = {
  session: Session | null
  mockNotice: boolean
  start(config: SessionConfig): void
  startRetry(source: Session): void
  updateConfig(patch: Partial<SessionConfig>): void
  setMaterial(text: string, fileName?: string): Promise<void>
  setPortrait(portrait: Portrait): void
  begin(): void
  addQuestion(q: Question): void
  addMessage(message: Message): void
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

    startRetry(source) {
      commit({
        id: newId(),
        createdAt: Date.now(),
        config: { ...source.config },
        material: { ...source.material },
        portrait: source.portrait,
        messages: [],
        questions: [],
        status: 'ready',
      })
    },

    updateConfig(patch) {
      const session = get().session
      if (!session) return
      commit({ ...session, config: { ...session.config, ...patch } })
    },

    async setMaterial(text, fileName) {
      const session = get().session
      if (!session) return
      const normalized = normalizeMaterial(text)
      const hash = await hashText(normalized)
      commit({
        ...session,
        material: { fileName, text: normalized, chars: normalized.length, hash },
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
      commit({ ...session, status: 'ongoing' })
    },

    addQuestion(question) {
      const session = get().session
      if (!session) return
      commit({ ...session, questions: [...session.questions, question], status: 'ongoing' })
    },

    addMessage(message) {
      const session = get().session
      if (!session) return
      commit({ ...session, messages: [...session.messages, message], status: 'ongoing' })
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
