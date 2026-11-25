import { buildPrompt } from './prompts'

it('uses plus model and 3000 tokens for report', () => {
  const prompt = buildPrompt('report', {})
  expect(prompt.model).toBe('qwen3.8-plus')
  expect(prompt.maxTokens).toBe(3000)
})

it('forbids fabrication in portrait system', () => {
  const prompt = buildPrompt('portrait', {})
  expect(prompt.system).toContain('不得编造')
})

it('limits hint to 300 tokens', () => {
  expect(buildPrompt('hint', {}).maxTokens).toBe(300)
})

it('embeds context in question prompt', () => {
  const prompt = buildPrompt('question', {
    material: '研究问题：A',
    strictness: 'press',
    followUpLevel: 1,
    recentMessages: [{ role: 'judge', text: '上一问' }],
  })
  expect(prompt.user).toContain('研究问题：A')
  expect(prompt.user).toContain('press')
  expect(prompt.user).toContain('上一问')
  expect(prompt.user).toContain('1')
})

it('embeds answer in evaluate prompt', () => {
  const prompt = buildPrompt('evaluate', {
    question: '你的样本量是多少？',
    answer: '一共 120 份',
  })
  expect(prompt.user).toContain('你的样本量是多少？')
  expect(prompt.user).toContain('一共 120 份')
})
