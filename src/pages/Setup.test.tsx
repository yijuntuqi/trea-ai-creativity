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
  })
  expect(navigateMock).toHaveBeenCalledWith('/material')
})

it('marks the chosen option as pressed', async () => {
  const user = userEvent.setup()
  render(<Setup />)

  const press = screen.getByRole('button', { name: '压力（连续追问）' })
  await user.click(press)
  expect(press).toHaveAttribute('aria-pressed', 'true')
})
