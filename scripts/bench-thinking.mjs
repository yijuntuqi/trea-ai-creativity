// 对比 qwen3.8-flash 开启/关闭思考模式的耗时与输出
import fs from 'node:fs'

const lines = fs.readFileSync('.env', 'utf8').split('\n')
const get = (k) => lines.find(l => l.startsWith(k + '='))?.slice(k.length + 1)?.trim()
const apiKey = get('MAAS_API_KEY')
const baseUrl = get('MAAS_BASE_URL')

const system = '你是一位答辩评委，请依据材料原文评判选手回答，指出缺失的证据与逻辑漏洞，并给出一段可直接背诵的参考回答。使用中文，评委口吻专业、克制、具体，不要客套开场白。只输出一个 JSON 对象，不要使用代码围栏，不要输出任何解释文字。'
const user = `请点评选手对当前问题的回答。

【当前问题】
你在自建数据集上达到93.2%的准确率，请说明数据集的采集场景、类别分布、训练/验证/测试划分方式？

【选手回答】
数据集来自三个校区，共12000张，四类垃圾均衡采样。按7:1.5:1.5划分，固定随机种子。

【材料要点】
数据采集自3个校区共12,000张图像，MobileNetV3，测试集准确率93.2%，F1=0.928。

输出字段：score（0-100 整数）、dimensions（accuracy/logic/depth/clarity，各 0-100）、comment（点评）、modelAnswer（参考回答）、followUp（可继续追问的一句）。`

async function call(label, extra) {
  const t0 = Date.now()
  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'qwen3.8-flash',
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
        max_tokens: 400,
        temperature: 0.3,
        ...extra,
      }),
    })
    const ms = Date.now() - t0
    const data = await res.json()
    const msg = data.choices?.[0]?.message ?? {}
    console.log(`\n[${label}] HTTP ${res.status} in ${ms}ms`)
    console.log(`  usage: ${JSON.stringify(data.usage)}`)
    console.log(`  reasoning_len=${(msg.reasoning_content || '').length} content_len=${(msg.content || '').length}`)
    console.log(`  content: ${(msg.content || '').slice(0, 400)}`)
  } catch (e) {
    console.log(`[${label}] FAILED in ${Date.now() - t0}ms: ${e.message}`)
  }
}

await call('default(thinking on)', {})
await call('enable_thinking:false', { enable_thinking: false })
