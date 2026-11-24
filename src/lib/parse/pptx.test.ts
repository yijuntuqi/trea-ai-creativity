import JSZip from 'jszip'
import { extractPptxText } from './pptx'

async function makeZip(files: Record<string, string>): Promise<ArrayBuffer> {
  const zip = new JSZip()
  for (const [name, content] of Object.entries(files)) zip.file(name, content)
  return zip.generateAsync({ type: 'arraybuffer' })
}

it('orders slides numerically', async () => {
  const buf = await makeZip({
    'ppt/slides/slide10.xml': '<p:sld><a:t>第十页要点</a:t></p:sld>',
    'ppt/slides/slide2.xml': '<p:sld><a:t>第二页要点</a:t></p:sld>',
  })

  expect(await extractPptxText(buf)).toBe('第二页要点\n\n第十页要点')
})

it('decodes entities and skips empty slides', async () => {
  const buf = await makeZip({
    'ppt/slides/slide1.xml': '<p:sld><a:t>A &amp; B</a:t></p:sld>',
    'ppt/slides/slide2.xml': '<p:sld><a:t> </a:t></p:sld>',
  })

  expect(await extractPptxText(buf)).toBe('A & B')
})

it('throws no-text when nothing extractable', async () => {
  const buf = await makeZip({ 'ppt/slides/slide1.xml': '<p:sld></p:sld>' })
  await expect(extractPptxText(buf)).rejects.toMatchObject({ code: 'no-text' })
})
