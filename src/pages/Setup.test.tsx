import { beforeEach, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Setup from './Setup'
import { useSessionStore } from '../store/session'

const { navigateMock } = vi.hoisted(() => ({ navigateMock: vi.fn() }))
vi.mock('react-router-dom', () => ({ useNavigate: () => navigateMock }))

beforeEach(() => {
  navigateMock.mockClear()
  localStorage.clear()
  useSessionStore.getState().reset()
})

it('renders four option groups', () => {
  render(<Setup />)
  expect(screen.getByText('答辩类型')).toBeInTheDocument()
  expect(screen.getByText('学科')).toBeInTheDocument()
  expect(screen.getByText('严格度')).toBeInTheDocument()
  expect(screen.getByText('限时')).toBeInTheDocument()
})

it('starts a session with defaults and navigates', async () => {
  const user = userEvent.setup()
  render(<Setup />)

  await user.click(screen.getByRole('button', { name: '下一步：上传材料' }))

  const session = useSessionStore.getState().session
  expect(session?.config).toEqual({
    type: 'undergrad',
    discipline: 'stem',
    strictness: 'standard',
    minutes: 15,
    questionTarget: 6,
    judges: ['method', 'innovation', 'application'],
  })
  expect(navigateMock).toHaveBeenCalledWith('/material')
})

it('stores a custom question target and judge selection', async () => {
  const user = userEvent.setup()
  render(<Setup />)

  await user.click(screen.getByRole('button', { name: '10 题' }))
  await user.click(screen.getByRole('button', { name: '方法论派 · 严谨型' }))
  await user.click(screen.getByRole('button', { name: '创新性质疑派 · 犀利型' }))

  await user.click(screen.getByRole('button', { name: '下一步：上传材料' }))

  expect(useSessionStore.getState().session?.config).toMatchObject({
    questionTarget: 10,
    judges: ['application'],
  })
})

it('marks the chosen option as pressed', async () => {
  const user = userEvent.setup()
  render(<Setup />)

  const press = screen.getByRole('button', { name: '压力（连续追问）' })
  await user.click(press)
  expect(press).toHaveAttribute('aria-pressed', 'true')
})

it('stores custom defense type, discipline and minutes', async () => {
  const user = userEvent.setup()
  render(<Setup />)

  await user.click(screen.getByRole('button', { name: '自定义' }))
  await user.type(screen.getByLabelText('自定义答辩类型'), '开题答辩')
  await user.click(screen.getByRole('button', { name: '其他' }))
  await user.type(screen.getByLabelText('自定义学科'), '建筑学')
  const minutes = screen.getByLabelText('自定义限时分钟数')
  await user.clear(minutes)
  await user.type(minutes, '40')

  await user.click(screen.getByRole('button', { name: '下一步：上传材料' }))

  expect(useSessionStore.getState().session?.config).toMatchObject({
    type: 'custom',
    customType: '开题答辩',
    discipline: 'other',
    customDiscipline: '建筑学',
    minutes: 40,
  })
})

it('blocks submit when custom fields are empty', async () => {
  const user = userEvent.setup()
  render(<Setup />)

  await user.click(screen.getByRole('button', { name: '自定义' }))
  await user.click(screen.getByRole('button', { name: '下一步：上传材料' }))

  expect(screen.getByText('请填写自定义答辩类型')).toBeInTheDocument()
  expect(navigateMock).not.toHaveBeenCalled()
})
