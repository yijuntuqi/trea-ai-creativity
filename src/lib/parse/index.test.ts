const { extractPptxMock, extractPdfMock } = vi.hoisted(() => ({
  extractPptxMock: vi.fn(),
  extractPdfMock: vi.fn(),
}))

vi.mock('./pptx', () => ({ extractPptxText: extractPptxMock }))
vi.mock('./pdf', () => ({ extractPdfText: extractPdfMock }))

import { parseFile } from './index'

beforeEach(() => {
  extractPptxMock.mockReset()
  extractPdfMock.mockReset()
})

it('reads txt files directly', async () => {
  const file = new File(['粘贴的大纲内容'], 'outline.txt')
  await expect(parseFile(file)).resolves.toEqual({ text: '粘贴的大纲内容' })
})

it('dispatches pptx and pdf case-insensitively', async () => {
  extractPptxMock.mockResolvedValue('幻灯片文本')
  extractPdfMock.mockResolvedValue('PDF 文本')

  await expect(parseFile(new File(['x'], 'deck.pptx'))).resolves.toEqual({ text: '幻灯片文本' })
  await expect(parseFile(new File(['x'], 'paper.PDF'))).resolves.toEqual({ text: 'PDF 文本' })
})

it('throws unsupported for unknown extensions', async () => {
  await expect(parseFile(new File(['x'], 'a.doc'))).rejects.toMatchObject({ code: 'unsupported' })
})

it('wraps unexpected errors as corrupt', async () => {
  extractPptxMock.mockRejectedValue(new Error('boom'))
  await expect(parseFile(new File(['x'], 'b.pptx'))).rejects.toMatchObject({ code: 'corrupt' })
})
