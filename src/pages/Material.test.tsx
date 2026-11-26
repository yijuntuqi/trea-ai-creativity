import { beforeEach, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Material from './Material'
import { useSessionStore } from '../store/session'

const { navigateMock, generatePortraitMock } = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  generatePortraitMock: vi.fn(),
}))

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
  Link: ({ to, children }: { to: string; children?: React.ReactNode }) => (
    <a href={to}>{children}</a>
  ),
}))
vi.mock('../lib/portrait', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/portrait')>()
  return { ...actual, generatePortrait: generatePortraitMock }
})

const portrait = {
  topic: '基于深度学习的中文情感分析',
  problem: '长文本情感判断不稳定',
  method: '构建标注语料对比基线',
  innovation: ['网络用语归一化'],
  evidence: ['F1 提升 4.3%'],
  limitations: ['领域覆盖有限'],
  keywords: ['情感分析'],
}

beforeEach(() => {
  navigateMock.mockClear()
  generatePortraitMock.mockReset()
  generatePortraitMock.mockResolvedValue({ portrait, source: 'mock' })
  localStorage.clear()
  useSessionStore.getState().reset()
  useSessionStore.getState().start({
    type: 'master',
    discipline: 'stem',
    strictness: 'standard',
    minutes: 15,
  })
})

it('analyzes pasted text and starts the defense', async () => {
  const user = userEvent.setup()
  render(<Material />)

  await user.type(screen.getByLabelText('材料文本'), '这是一段足够长的答辩材料，'.repeat(15))
  await user.click(screen.getByRole('button', { name: '解析并生成画像' }))

  expect(await screen.findByText('基于深度学习的中文情感分析')).toBeInTheDocument()
  expect(screen.getByText('方法论派 · 严谨型')).toBeInTheDocument()
  expect(screen.getByText('创新性质疑派 · 犀利型')).toBeInTheDocument()
  expect(screen.getByText('应用价值派 · 务实型')).toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: '开始答辩' }))
  const id = useSessionStore.getState().session?.id
  expect(navigateMock).toHaveBeenCalledWith(`/session/${id}`)
})

it('rejects empty txt upload without generating a portrait', async () => {
  const user = userEvent.setup()
  render(<Material />)

  const file = new File(['   '], 'empty.txt', { type: 'text/plain' })
  await user.upload(screen.getByLabelText('上传文件'), file)

  expect(await screen.findByText('empty.txt：文件内容为空')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: '解析并生成画像' }))
  expect(generatePortraitMock).not.toHaveBeenCalled()
})
