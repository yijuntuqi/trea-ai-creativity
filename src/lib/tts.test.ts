import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { isSpeechSupported, speak, stopSpeaking } from './tts'

const spoken: Array<{ text: string; lang: string; rate: number }> = []
const speakMock = vi.fn((utterance: { text: string; lang: string; rate: number }) => {
  spoken.push(utterance)
})
const cancelMock = vi.fn()

class FakeUtterance {
  text: string
  lang = ''
  rate = 1

  constructor(text: string) {
    this.text = text
  }
}

beforeEach(() => {
  spoken.length = 0
  speakMock.mockClear()
  cancelMock.mockClear()
  vi.stubGlobal('speechSynthesis', { speak: speakMock, cancel: cancelMock })
  vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

it('speaks the question in Chinese', () => {
  speak('你的样本量为什么是 30？')
  expect(speakMock).toHaveBeenCalledTimes(1)
  expect(spoken[0].text).toBe('你的样本量为什么是 30？')
  expect(spoken[0].lang).toBe('zh-CN')
})

it('cancels before speaking again', () => {
  speak('第一问')
  speak('第二问')
  expect(cancelMock).toHaveBeenCalledTimes(2)
})

it('stops current speech', () => {
  stopSpeaking()
  expect(cancelMock).toHaveBeenCalledTimes(1)
})

it('reports unsupported when speech synthesis is missing', () => {
  vi.unstubAllGlobals()
  expect(isSpeechSupported()).toBe(false)
})
