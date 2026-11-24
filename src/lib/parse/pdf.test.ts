const { getDocumentMock } = vi.hoisted(() => ({ getDocumentMock: vi.fn() }))

vi.mock('./pdfjs', () => ({ default: { getDocument: getDocumentMock } }))

import { extractPdfText } from './pdf'

beforeEach(() => {
  getDocumentMock.mockReset()
})

it('joins text items across pages', async () => {
  getDocumentMock.mockReturnValue({
    promise: Promise.resolve({
      numPages: 1,
      getPage: async () => ({
        getTextContent: async () => ({
          items: [{ str: '研究问题与方法' }, { str: '：基于访谈的实证分析' }, { str: '，样本为 42 名本科生。' }],
        }),
      }),
    }),
  })

  const text = await extractPdfText(new ArrayBuffer(8))
  expect(text).toContain('研究问题与方法')
})

it('rejects scanned pdf without text layer', async () => {
  getDocumentMock.mockReturnValue({
    promise: Promise.resolve({
      numPages: 1,
      getPage: async () => ({
        getTextContent: async () => ({ items: [{ str: ' ' }, { str: '' }] }),
      }),
    }),
  })

  await expect(extractPdfText(new ArrayBuffer(8))).rejects.toMatchObject({ code: 'no-text' })
})
