# 答辩预演官 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 交付一个可公网访问的 AI 答辩预演应用：上传论文/PPT → 生成 3 位评委 → 多轮追问 → 四维评分报告。

**Architecture:** Vite + React 19 单页前端，材料在浏览器本地解析，会话与报告存 localStorage；Netlify Function 单入口 `/api/llm` 代理阿里云 MaaS 的 OpenAI 兼容流式接口，服务端构建 prompt 并隐藏密钥。无 Key 或调用失败时自动降级为 mock，流程不中断。

**Tech Stack:** React 19、TypeScript、Vite、Tailwind CSS v4、React Router 7、Zustand 5、Recharts 3、Framer Motion、pdfjs-dist、jszip、html-to-image、Vitest、Testing Library、Netlify Functions。

**Spec:** [docs/superpowers/specs/2026-11-24-defense-rehearsal-design.md](../specs/2026-11-24-defense-rehearsal-design.md)

## Global Constraints

- 运行环境：本地 Node 24，Netlify Functions 使用 Node 20；包管理 npm。
- 前端所有文案为中文；代码标识符为英文。
- `MAAS_API_KEY` 只允许出现在本地 `.env` 与 Netlify 环境变量；`.env` 必须在 `.gitignore` 中，前端代码与构建产物不得出现密钥。
- 所有材料解析在浏览器完成，文件不上传；只允许把截断后的文本发送给模型。
- 模型：主力 `qwen3.8-flash`，报告 `qwen3.8-plus`；`max_tokens` 固定为提问 300、点评 400、提示 200、画像 900、报告 1500。
- MaaS 基址：`https://ws-4hkjkfltx0ydu89i.cn-beijing.maas.aliyuncs.com/compatible-mode/v1`。
- 默认 mock 优先；真实调用失败必须自动降级 mock 并在界面显示"演示模式"标识。
- 评分权重固定：内容准确性 0.30、逻辑结构 0.25、应答深度 0.25、表达清晰 0.20；总分四舍五入取整，≥85 优秀、≥70 良好、其余待改进。
- 材料截断上限 4000 汉字；单次请求 payload 序列化后 ≤ 12000 字符。
- TTS 使用浏览器 `SpeechSynthesis`，默认关闭，不接模型语音接口。
- 移动端验收宽度 390px，桌面验收宽度 1440px。
- 单场答辩题数 6–10，追问最多 2 层。
- 每天真实调用上限 200 次，超出后只走 mock。
- 每个任务结束必须提交一次 git commit，提交信息使用 `feat:` / `test:` / `chore:` 前缀。

## Review Focus

以下五类输入或状态最容易让真实用户踩坑，对应测试必须落在拥有该代码的任务里：

1. **PPTX 结构异常**：页序混乱、缺 `slideN.xml`、页面无文本时，解析应返回可读文本或明确降级提示，不得抛未捕获异常。
2. **PDF 无文本层**：扫描件应得到"未识别到文本，请粘贴大纲"的明确提示，而不是空字符串或崩溃。
3. **模型返回非标准 JSON**：带 ```json 围栏、前后有解释文字、尾逗号时仍应解析成功；彻底失败时走一次重试与通用兜底。
4. **网络/密钥失败发生在答辩中途**：已答内容不得丢失，界面显示演示模式，流程继续到报告。
5. **空回答或刷新页面**：少于 10 字的回答不计分并提示补充；刷新后能从 localStorage 恢复到当前题。

---

## 文件结构

```
.
├─ netlify/functions/
│  └─ llm.ts                 # 唯一后端入口：校验、构建 prompt、代理 MaaS 流
├─ src/
│  ├─ main.tsx
│  ├─ App.tsx                # 路由
│  ├─ pages/
│  │  ├─ Home.tsx
│  │  ├─ Setup.tsx
│  │  ├─ Material.tsx        # 输入 + 解析 + 画像 + 开始答辩
│  │  ├─ Session.tsx         # 答辩室
│  │  ├─ Report.tsx
│  │  └─ History.tsx
│  ├─ components/
│  │  ├─ AppShell.tsx
│  │  ├─ JudgeCard.tsx
│  │  ├─ ChatBubble.tsx
│  │  ├─ Timer.tsx
│  │  ├─ ScoreRadar.tsx
│  │  ├─ MockBadge.tsx
│  │  └─ ui/                 # Button / Card / Input / Textarea / Select
│  ├─ hooks/
│  │  ├─ useElapsedTimer.ts
│  │  └─ useDefenseEngine.ts
│  ├─ lib/
│  │  ├─ judges.ts
│  │  ├─ scoring.ts
│  │  ├─ report.ts
│  │  ├─ quota.ts
│  │  ├─ tts.ts
│  │  ├─ hash.ts
│  │  ├─ truncate.ts
│  │  ├─ json.ts
│  │  ├─ prompts.ts
│  │  ├─ llm.ts
│  │  ├─ mock.ts
│  │  ├─ portrait.ts
│  │  ├─ storage.ts
│  │  └─ parse/{pdfjs.ts,pdf.ts,pptx.ts,index.ts}
│  ├─ store/session.ts
│  ├─ mocks/demo.ts
│  ├─ types/index.ts
│  ├─ styles/theme.css
│  └─ test/setup.ts
├─ public/judges/{method,innovation,application}.jpg
├─ docs/
├─ .env.example
├─ netlify.toml
├─ package.json
├─ tsconfig.json
└─ vite.config.ts
```

---

### Task 1: 脚手架、测试基建与路由骨架

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `.gitignore`, `.env.example`
- Create: `src/main.tsx`, `src/App.tsx`, `src/styles/theme.css`, `src/test/setup.ts`
- Create: `src/components/AppShell.tsx`
- Test: `src/App.test.tsx`

**Interfaces:**
- Produces: `App` 默认导出；路由 `/`、`/setup`、`/material`、`/session/:id`、`/report/:id`、`/history`；CSS token `--color-ink`、`--color-gold`、`--color-paper`。

- [ ] **Step 1: 初始化仓库并配置远程**

```powershell
git init
git remote add origin git@github.com:yijuntuqi/trea-ai-creativity.git
```

- [ ] **Step 2: 写脚手架配置**

`package.json` 脚本固定为：

```json
{
  "scripts": {
    "dev": "netlify dev",
    "dev:vite": "vite",
    "build": "tsc --noEmit && vite build",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

安装依赖：

```powershell
npm i react react-dom react-router-dom zustand recharts framer-motion clsx tailwind-merge class-variance-authority lucide-react pdfjs-dist jszip html-to-image
npm i -D vite @vitejs/plugin-react typescript @types/react @types/react-dom tailwindcss @tailwindcss/vite vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event netlify-cli @netlify/functions
```

`vite.config.ts` 必须包含：

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  test: { environment: 'jsdom', globals: true, setupFiles: './src/test/setup.ts', css: true },
})
```

`tsconfig.json` 必须包含 `"jsx": "react-jsx"`、`"moduleResolution": "bundler"`、`"paths": { "@/*": ["./src/*"] }`、`"types": ["vitest/globals"]`。

`src/test/setup.ts` 只放一行：

```ts
import '@testing-library/jest-dom/vitest'
```

`.gitignore` 必须包含：`node_modules`、`dist`、`.env`、`.netlify`、`*.local`。

`.env.example` 写占位符，不含真实值：

```
MAAS_API_KEY=your-key-here
MAAS_BASE_URL=https://ws-4hkjkfltx0ydu89i.cn-beijing.maas.aliyuncs.com/compatible-mode/v1
VITE_DEMO_MODE=0
```

- [ ] **Step 3: 写失败的 App 测试**

```tsx
// src/App.test.tsx
import { render, screen } from '@testing-library/react'
import App from './App'

it('renders the product name', () => {
  render(<App />)
  expect(screen.getByRole('heading', { name: '答辩预演官' })).toBeInTheDocument()
})
```

- [ ] **Step 4: 运行测试确认失败**

Run: `npm test -- src/App.test.tsx`
Expected: FAIL，提示找不到 `./App`。

- [ ] **Step 5: 实现主题、AppShell 与路由占位**

`src/styles/theme.css` 用 Tailwind v4 语法定义 token：`--color-ink: #0B1220`、`--color-ink-soft: #111B2E`、`--color-gold: #E8B45A`、`--color-paper: #F5F1E8`，正文 `background: var(--color-ink)`，标题字体栈 `"Noto Serif SC","Source Han Serif SC","Songti SC",serif`。

`App.tsx` 用 `BrowserRouter` + `Routes`，六个路由先渲染占位 `<div>`；首页占位必须包含文本 `答辩预演官`。`AppShell` 提供顶部品牌栏与 `<main>` 容器。

- [ ] **Step 6: 运行测试确认通过并构建**

Run: `npm test -- src/App.test.tsx`
Expected: PASS。

Run: `npm run build`
Expected: 退出码 0。

- [ ] **Step 7: 提交**

```powershell
git add -A
git commit -m "chore: scaffold vite react app with test setup"
```

---

### Task 2: 领域类型、评委与评分

**Files:**
- Create: `src/types/index.ts`
- Create: `src/lib/judges.ts`
- Create: `src/lib/scoring.ts`
- Create: `src/lib/report.ts`
- Test: `src/lib/scoring.test.ts`, `src/lib/report.test.ts`

**Interfaces:**
- Produces:

```ts
export type Strictness = 'gentle' | 'standard' | 'press'
export type DefenseType = 'undergrad' | 'master' | 'project' | 'course'
export type Discipline = 'stem' | 'humanities' | 'business' | 'medicine' | 'art' | 'other'
export type SessionConfig = { type: DefenseType; discipline: Discipline; strictness: Strictness; minutes: 8 | 15 | 25 }
export type Material = { fileName?: string; text: string; chars: number; hash: string }
export type Portrait = { topic: string; problem: string; method: string; innovation: string[]; evidence: string[]; limitations: string[]; keywords: string[] }
export type JudgeId = 'method' | 'innovation' | 'application'
export type Judge = { id: JudgeId; name: string; focus: string; style: string; color: string; avatar: string }
export type Question = { id: string; judgeId: JudgeId; text: string; intent: string; suggestedSeconds: number; followUpLevel: 0 | 1 | 2; answer?: string; timeSpent?: number; score?: number; comment?: string; modelAnswer?: string }
export type Message = { id: string; role: 'judge' | 'user' | 'system'; judgeId?: JudgeId; text: string; createdAt: number }
export type DimensionScores = { accuracy: number; logic: number; depth: number; clarity: number }
export type QuestionReview = { questionId: string; question: string; answer: string; score: number; comment: string; modelAnswer: string }
export type RiskItem = { question: string; reason: string }
export type Report = { total: number; level: '优秀' | '良好' | '待改进'; dimensions: DimensionScores; questions: QuestionReview[]; topRisks: RiskItem[]; checklist: string[]; summary: string; createdAt: number }
export type Session = { id: string; createdAt: number; config: SessionConfig; material: Material; portrait?: Portrait; messages: Message[]; questions: Question[]; report?: Report; status: 'setup' | 'ready' | 'ongoing' | 'finished' }
export type ReportModelOutput = { dimensions: DimensionScores; summary: string; checklist: string[]; topRisks: RiskItem[]; questionReviews: QuestionReview[] }
export function finalizeReport(output: ReportModelOutput, session: Session): Report
```

- [ ] **Step 1: 写失败的评分与评委测试**

```ts
import { DIMENSION_WEIGHTS, levelOf, weightedTotal } from './scoring'
import { JUDGES } from './judges'

it('computes weighted total', () => {
  expect(weightedTotal({ accuracy: 80, logic: 90, depth: 70, clarity: 100 })).toBe(84)
})
it('maps levels at boundaries', () => {
  expect(levelOf(85)).toBe('优秀')
  expect(levelOf(70)).toBe('良好')
  expect(levelOf(69)).toBe('待改进')
})
it('has three distinct judges', () => {
  expect(JUDGES.map(j => j.id)).toEqual(['method', 'innovation', 'application'])
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- src/lib/scoring.test.ts`
Expected: FAIL，模块不存在。

- [ ] **Step 3: 实现类型、评委与评分**

`DIMENSION_WEIGHTS` 常量精确为 `{ accuracy: 0.3, logic: 0.25, depth: 0.25, clarity: 0.2 }`。`weightedTotal` 使用 `Math.round`。`levelOf` 按 ≥85 / ≥70 / 其余。

`JUDGES` 三条数据的 `name` 分别为「方法论派 · 严谨型」「创新性质疑派 · 犀利型」「应用价值派 · 务实型」，`avatar` 指向 `/judges/method.jpg` 等本地路径，`color` 分别用 `#6FA8DC`、`#E8B45A`、`#7BC47F`。

- [ ] **Step 4: 运行测试确认通过**

Run: `npm test -- src/lib/scoring.test.ts`
Expected: PASS。

- [ ] **Step 5: 写失败的报告聚合测试**

构造一场含 6 个 `Question` 的 session，模型输出 `dimensions = { accuracy: 80, logic: 85, depth: 75, clarity: 90 }`、`checklist: []`、`topRisks` 7 条、`questionReviews: []`。断言：

```ts
const report = finalizeReport(output, session)
expect(report.total).toBe(weightedTotal(output.dimensions))
expect(report.level).toBe(levelOf(report.total))
expect(report.topRisks).toHaveLength(5)
expect(report.checklist.length).toBeGreaterThanOrEqual(3)
expect(report.questions).toHaveLength(6)
expect(typeof report.createdAt).toBe('number')
```

- [ ] **Step 6: 实现 finalizeReport**

以本地 `session.questions` 为准补齐缺失的 `questionReviews`（分数取 `question.score ?? 0`，点评取 `question.comment ?? '暂无点评'`）；`topRisks` 截断到 5；`checklist` 为空时补 3 条默认建议；总分与等级一律本地计算，不信任模型给的总分。

- [ ] **Step 7: 运行测试确认通过**

Run: `npm test -- src/lib/report.test.ts`
Expected: PASS。

- [ ] **Step 8: 提交**

```powershell
git add src/types src/lib/judges.ts src/lib/scoring.ts src/lib/report.ts src/lib/scoring.test.ts src/lib/report.test.ts
git commit -m "feat: add domain types judges scoring and report aggregation"
```

---

### Task 3: 材料管道（hash、截断、PPTX、PDF）

**Files:**
- Create: `src/lib/hash.ts`, `src/lib/truncate.ts`
- Create: `src/lib/parse/pdfjs.ts`, `src/lib/parse/pdf.ts`, `src/lib/parse/pptx.ts`, `src/lib/parse/index.ts`
- Test: `src/lib/truncate.test.ts`, `src/lib/parse/pptx.test.ts`, `src/lib/parse/pdf.test.ts`, `src/lib/parse/index.test.ts`

**Interfaces:**
- Produces:

```ts
export async function hashText(text: string): Promise<string> // SHA-256 前 16 位 hex
export function truncateMaterial(text: string, maxChars?: number): string
export async function extractPptxText(buffer: ArrayBuffer): Promise<string>
export async function extractPdfText(buffer: ArrayBuffer): Promise<string>
export type ParseErrorCode = 'unsupported' | 'no-text' | 'corrupt'
export class ParseError extends Error { constructor(public code: ParseErrorCode, message: string) }
export async function parseFile(file: File): Promise<{ text: string; warning?: string }>
```

- [ ] **Step 1: 写失败的截断与 hash 测试**

```ts
it('keeps head and conclusion within limit', () => {
  const text = '研究问题：A\n\n' + '方法细节。'.repeat(1500) + '\n\n结论：B'
  const out = truncateMaterial(text, 4000)
  expect(out.startsWith('研究问题：A')).toBe(true)
  expect(out).toContain('结论：B')
  expect(out.length).toBeLessThanOrEqual(4000)
})
it('returns short text unchanged', () => {
  expect(truncateMaterial('短文本')).toBe('短文本')
})
it('hashes deterministically', async () => {
  const a = await hashText('材料')
  expect(a).toMatch(/^[0-9a-f]{16}$/)
  expect(await hashText('材料')).toBe(a)
  expect(await hashText('材料2')).not.toBe(a)
})
```

- [ ] **Step 2: 运行确认失败**

Run: `npm test -- src/lib/truncate.test.ts`
Expected: FAIL。

- [ ] **Step 3: 实现 hash 与截断**

`hashText` 用 `crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))`，取 hex 前 16 位。

`truncateMaterial` 规则：统一换行、去首尾空白、把 3 个以上连续换行压成 2 个；长度不超过上限时原样返回；超限时先保留首段，再从剩余段落中优先挑选命中 `/方法|实验|结果|结论|讨论|method|result|conclusion/i` 的段落，最后保留原文末段，按原顺序拼接，总长不超过上限。

- [ ] **Step 4: 写失败的 PPTX 测试**

用 JSZip 在测试内生成含 `ppt/slides/slide10.xml`、`slide2.xml` 的 zip，XML 内容形如 `<p:sld><a:t>第二页要点</a:t></p:sld>`。断言输出为 `第二页要点\n\n第十页要点`（按数字排序，不是字典序）。

- [ ] **Step 5: 实现 PPTX 提取**

`extractPptxText` 用 `JSZip.loadAsync(buffer)`，筛选 `/^ppt\/slides\/slide(\d+)\.xml$/`，按捕获数字升序排序；每页用 `/<a:t[^>]*>([\s\S]*?)<\/a:t>/g` 提取并反转义 `&amp; &lt; &gt; &quot; &apos;`；页间用 `\n\n` 连接；没有任何文本时抛 `ParseError('no-text', '未识别到文本')`。

- [ ] **Step 6: 写失败的 PDF 测试**

`vi.mock('./pdfjs', ...)` 返回 `getDocument` → `{ promise: { numPages: 1, getPage: async () => ({ getTextContent: async () => ({ items: [{ str: '研究问题' }, { str: '与方法' }] }) }) } }`。断言 `extractPdfText` 返回包含「研究问题与方法」。再加一例：items 全为空字符串时拒绝并抛出 `code === 'no-text'`。

- [ ] **Step 7: 实现 PDF 提取**

`src/lib/parse/pdfjs.ts` 负责导入 `pdfjs-dist` 并设置 worker：

```ts
import * as pdfjs from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl
export default pdfjs
```

`extractPdfText` 逐页 `getTextContent()`，拼接 `items[].str`，页间换行；总文本 trim 后长度 < 20 抛 `ParseError('no-text', '未识别到文本，请粘贴大纲')`。

- [ ] **Step 8: 写失败的 parseFile 分派测试**

断言：`.txt` 抛 `unsupported`；`.pptx` 调用 PPTX 提取；`.PDF`（大写）也走 PDF；解析异常统一转成 `ParseError('corrupt', ...)`。

- [ ] **Step 9: 实现 parseFile**

按文件名小写扩展名分派；`.txt` 直接读取文本（作为粘贴以外的便利）；其他扩展名抛 `unsupported`。

- [ ] **Step 10: 运行全部解析测试**

Run: `npm test -- src/lib/truncate.test.ts src/lib/parse`
Expected: 全部 PASS。

- [ ] **Step 11: 提交**

```powershell
git add src/lib/hash.ts src/lib/truncate.ts src/lib/parse src/lib/*.test.ts
git commit -m "feat: add local material parsing pipeline"
```

---

### Task 4: Prompt、LLM 客户端、Mock 与 JSON 容错

**Files:**
- Create: `src/lib/prompts.ts`, `src/lib/llm.ts`, `src/lib/mock.ts`, `src/lib/json.ts`
- Test: `src/lib/prompts.test.ts`, `src/lib/json.test.ts`, `src/lib/llm.test.ts`

**Interfaces:**
- Produces:

```ts
export type LLMTask = 'portrait' | 'question' | 'evaluate' | 'hint' | 'report'
export type LLMRequest = { task: LLMTask; payload: Record<string, unknown>; sessionId: string }
export type Usage = { prompt: number; completion: number }
export type RunResult = { text: string; source: 'live' | 'mock'; usage?: Usage }
export function buildPrompt(task: LLMTask, payload: Record<string, unknown>): { system: string; user: string; model: string; maxTokens: number; temperature: number }
export function parseLooseJSON<T>(raw: string): T
export async function runTask(req: LLMRequest, onDelta: (text: string) => void, opts?: { signal?: AbortSignal }): Promise<RunResult>
export function mockTask(task: LLMTask, payload: Record<string, unknown>): string
```

`LLMTask` 与 `buildPrompt` 必须放在 `src/lib/prompts.ts`，且 `prompts.ts` 内只用相对导入、不能使用 `@/` 别名，因为 Netlify Function 会以相对路径复用它；`LLMRequest` 与 `runTask` 放在 `src/lib/llm.ts`。

- [ ] **Step 1: 写失败的 prompt 映射测试**

断言：`buildPrompt('report', {})` 的 `model === 'qwen3.8-plus'`、`maxTokens === 1500`；`buildPrompt('portrait', {})` 的 `system` 包含「不得编造」；`buildPrompt('hint', {})` 的 `maxTokens === 200`。

- [ ] **Step 2: 实现 prompts**

四类 JSON 任务（portrait/question/evaluate/report）在 system 末尾明确「只输出一个 JSON 对象，不要代码围栏」；`question` 的 user 包含材料要点、最近 3 轮对话、严格度、`followUpLevel`；`evaluate` 包含当前问题、用户回答、材料要点。`hint` 输出纯文本。

- [ ] **Step 3: 写失败的 JSON 容错测试**

```ts
it('parses fenced json', () => {
  expect(parseLooseJSON('```json\n{"a":1}\n```')).toEqual({ a: 1 })
})
it('parses json with prose around it', () => {
  expect(parseLooseJSON('好的，结果如下：{"a":2} 完毕')).toEqual({ a: 2 })
})
it('repairs trailing comma', () => {
  expect(parseLooseJSON('{"a":3,}')).toEqual({ a: 3 })
})
it('throws on junk', () => {
  expect(() => parseLooseJSON('不是 JSON')).toThrow('JSON_PARSE_FAILED')
})
```

- [ ] **Step 4: 实现 parseLooseJSON**

剥离围栏 → 截取第一个 `{` 到最后一个 `}` → 先直接 `JSON.parse` → 失败则删除 `,\s*([}\]])` 中的逗号再试 → 仍失败抛 `new Error('JSON_PARSE_FAILED')`。

- [ ] **Step 5: 写失败的 LLM 流式与降级测试**

用 `vi.stubGlobal('fetch', ...)` 返回 `new Response(ReadableStream)`，流内容为 `data: {"delta":"你"}\n\ndata: {"delta":"好"}\n\ndata: {"done":true}\n\n`。断言 `onDelta` 收到 `你`、`好`，`result.text === '你好'`、`source === 'live'`。

再加一例 fetch reject，断言不抛错、`source === 'mock'` 且 `text` 非空。

- [ ] **Step 6: 实现 mock 与 runTask**

`mockTask` 按任务返回固定 JSON：画像含 6 个字段；问题含 `judgeId/text/intent/suggestedSeconds`；点评含 `score/dimensions/comment/modelAnswer/followUp`；报告含 `dimensions/summary/checklist/topRisks/questionReviews`。

`runTask` 行为：`import.meta.env.VITE_DEMO_MODE === '1'` 时直接 mock；否则 `fetch('/api/llm', { method: 'POST', body: JSON.stringify(req) })`，逐行解析 `data:`，`delta` 回调，`done` 结束；任何网络错误、非 2xx、空响应都转 mock，并在 mock 文本上以 `onDelta` 回放。

- [ ] **Step 7: 运行测试确认通过**

Run: `npm test -- src/lib/prompts.test.ts src/lib/json.test.ts src/lib/llm.test.ts`
Expected: PASS。

- [ ] **Step 8: 提交**

```powershell
git add src/lib/prompts.ts src/lib/llm.ts src/lib/mock.ts src/lib/json.ts src/lib/*.test.ts
git commit -m "feat: add llm client prompts and mock fallback"
```

---

### Task 5: Netlify Function 代理

**Files:**
- Create: `netlify/functions/llm.ts`
- Create: `netlify.toml`
- Test: `netlify/functions/llm.test.ts`

**Interfaces:**
- Consumes: `buildPrompt`、`LLMTask`（Task 4）。
- Produces: 默认导出 `handler(req: Request): Promise<Response>`；`POST /api/llm`；SSE 帧为 `{"delta":"..."}` 与 `{"done":true}`。

- [ ] **Step 1: 写失败的函数测试**

```ts
import handler from './llm'

it('rejects unknown task', async () => {
  const res = await handler(new Request('http://localhost/api/llm', { method: 'POST', body: JSON.stringify({ task: 'x', payload: {}, sessionId: 's' }) }))
  expect(res.status).toBe(400)
})
it('rejects oversized payload', async () => {
  const payload = { text: 'x'.repeat(20000) }
  const res = await handler(new Request('http://localhost/api/llm', { method: 'POST', body: JSON.stringify({ task: 'portrait', payload, sessionId: 's' }) }))
  expect(res.status).toBe(413)
})
it('streams deltas', async () => {
  vi.stubEnv('MAAS_API_KEY', 'test-key')
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
    new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"content":"你好"}}]}\n\ndata: [DONE]\n\n')); c.close() } }),
    { status: 200 }
  )))
  const res = await handler(new Request('http://localhost/api/llm', { method: 'POST', body: JSON.stringify({ task: 'question', payload: {}, sessionId: 's' }) }))
  expect(res.headers.get('content-type')).toContain('text/event-stream')
  expect(await res.text()).toContain('"delta":"你好"')
})
```

- [ ] **Step 2: 运行确认失败**

Run: `npm test -- netlify/functions/llm.test.ts`
Expected: FAIL。

- [ ] **Step 3: 实现 handler**

要求：只接受 POST；解析 JSON 失败返回 400；`task` 必须在白名单；`JSON.stringify(payload).length > 12000` 返回 413；缺少 `MAAS_API_KEY` 返回 500 JSON `{ error: { code: 'NO_KEY' } }`。调用 `buildPrompt(task, payload)`，向 `${MAAS_BASE_URL}/chat/completions` 发起 `stream: true` 请求，请求体包含 `model`、`messages`、`max_tokens`、`temperature`。把上游 OpenAI SSE 转换为本项目的简化帧：读取 `choices[0].delta.content`，输出 `data: {"delta":"..."}\n\n`，结束时输出 `data: {"done":true}\n\n`。上游非 2xx 时返回 502 JSON。

函数用相对路径 `../../src/lib/prompts` 导入 `buildPrompt` 与 `LLMTask`，不要使用 `@/` 别名。模块级维护当日匿名请求计数，超过 1000 次返回 429（仅内存兜底，不落盘、不记录内容）。

- [ ] **Step 4: 配置 netlify.toml**

```toml
[build]
  command = "npm run build"
  publish = "dist"
  functions = "netlify/functions"

[functions]
  node_bundler = "esbuild"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

- [ ] **Step 5: 运行测试确认通过**

Run: `npm test -- netlify/functions/llm.test.ts`
Expected: PASS。

- [ ] **Step 6: 提交**

```powershell
git add netlify netlify.toml
git commit -m "feat: add netlify llm proxy function"
```

---

### Task 6: 会话存储、配额与 Zustand

**Files:**
- Create: `src/lib/storage.ts`, `src/lib/quota.ts`, `src/store/session.ts`
- Test: `src/lib/storage.test.ts`, `src/lib/quota.test.ts`, `src/store/session.test.ts`

**Interfaces:**
- Consumes: `Session`、`SessionConfig`、`Material`、`Portrait`、`Report`（Task 2）；`hashText`、`truncateMaterial`（Task 3）。
- Produces:

```ts
export function loadSessions(): Session[]
export function getSession(id: string): Session | undefined
export function saveSession(session: Session): void
export function deleteSession(id: string): void
export function clearSessions(): void
export function canCallToday(): boolean
export function consumeCall(): void
export function resetQuotaForTest(): void

export const useSessionStore: UseBoundStore<StoreApi<SessionState>>
type SessionState = {
  session: Session | null
  mockNotice: boolean
  start(config: SessionConfig): void
  setMaterial(text: string, fileName?: string): Promise<void>
  setPortrait(portrait: Portrait): void
  begin(): void
  addQuestion(q: Question): void
  answerQuestion(id: string, answer: string, timeSpent: number): void
  evaluateQuestion(id: string, score: number, comment: string, modelAnswer: string): void
  finish(report: Report): void
  restore(id: string): void
  setMockNotice(v: boolean): void
  reset(): void
}
```

- [ ] **Step 1: 写失败的 storage 测试**

断言：空 localStorage 返回 `[]`；`saveSession` 后能按 id 读取；保存 21 场后只剩 20 场且最新的在首位；`deleteSession` 与 `clearSessions` 生效；损坏 JSON 返回 `[]` 不抛错。

- [ ] **Step 2: 实现 storage**

key 固定 `dr:sessions`；写入前 `JSON.stringify`；读取用 try/catch；按 `createdAt` 降序；上限 20。

- [ ] **Step 3: 写失败的配额测试**

断言：初始 `canCallToday()` 为 true；连续 `consumeCall()` 200 次后为 false；跨天（mock 日期变化）恢复；key 固定 `dr:quota`，结构 `{ date: 'YYYY-MM-DD', count: number }`。

- [ ] **Step 4: 实现配额**

用本地时区日期字符串比较，日期变化时重置计数。

- [ ] **Step 5: 写失败的 store 测试**

断言：`start(config)` 生成非空 id、状态 `setup`；`setMaterial('材料', 'a.pdf')` 后 `material.chars === 2`、`hash` 非空、状态 `ready`；`addQuestion` 后状态 `ongoing`；`finish(report)` 后状态 `finished` 且 localStorage 中存在该场次；`restore(id)` 能恢复。

- [ ] **Step 6: 实现 store**

只用 Zustand 基础 `create`，不引入 persist 中间件；每次修改后调用 `saveSession` 保存（除 `setup` 阶段外）；`setMaterial` 内先 `truncateMaterial(text)` 再 `hashText`。每个测试前调用 `reset()` 与 `localStorage.clear()`。

- [ ] **Step 7: 运行测试确认通过**

Run: `npm test -- src/lib/storage.test.ts src/lib/quota.test.ts src/store/session.test.ts`
Expected: PASS。

- [ ] **Step 8: 提交**

```powershell
git add src/lib/storage.ts src/lib/quota.ts src/store src/lib/*.test.ts
git commit -m "feat: add local session storage quota and store"
```

---

### Task 7: 首页、建场、材料与画像

**Files:**
- Create: `src/pages/Home.tsx`, `src/pages/Setup.tsx`, `src/pages/Material.tsx`
- Create: `src/components/JudgeCard.tsx`, `src/components/ui/{Button,Card,Input,Textarea,Select}.tsx`
- Create: `src/lib/portrait.ts`
- Modify: `src/App.tsx`
- Test: `src/pages/Setup.test.tsx`, `src/pages/Material.test.tsx`, `src/lib/portrait.test.ts`

**Interfaces:**
- Consumes: `useSessionStore`（Task 6）；`parseFile`（Task 3）；`runTask`、`parseLooseJSON`（Task 4）；`JUDGES`（Task 2）。
- Produces:

```ts
export async function generatePortrait(material: Material, config: SessionConfig, onDelta?: (t: string) => void): Promise<{ portrait: Portrait; source: 'live' | 'mock' }>
export function genericPortrait(text: string): Portrait
```

- [ ] **Step 1: 写失败的 Setup 测试**

渲染 `/setup`，断言四组选项存在；默认值提交后调用 `start` 并导航到 `/material`。测试中把 `useNavigate` mock 成 `vi.fn()`。

- [ ] **Step 2: 实现 Setup**

四组配置：答辩类型 4 项、学科 6 项、严格度 3 项、限时 3 项；使用原生 `button` 组选中态（`aria-pressed`），底部主按钮「下一步：上传材料」。提交时调用 `start(config)` 并导航。

- [ ] **Step 3: 写失败的画像兜底测试**

```ts
it('falls back to generic portrait when model output is invalid', async () => {
  const p = genericPortrait('研究问题：如何提升答辩表现\n方法：访谈与实验\n结论：有效')
  expect(p.topic).toContain('如何提升答辩表现')
  expect(p.innovation.length).toBeGreaterThan(0)
  expect(p.limitations.length).toBeGreaterThan(0)
})
```

- [ ] **Step 4: 实现 portrait**

`generatePortrait` 调用 `runTask('portrait', { material: material.text, config }, onDelta)`；`parseLooseJSON<Portrait>` 成功则补全缺失数组为 `[]` 返回；失败重试一次；仍失败返回 `genericPortrait(material.text)`，`source: 'mock'`。

`genericPortrait` 取首个非空行作为 topic（截 60 字），method 默认「材料中未明确说明」，innovation/limitations 给一条通用占位而不是空数组。

- [ ] **Step 5: 写失败的 Material 测试**

粘贴 200 字文本 → 点击「解析并生成画像」→ mock `generatePortrait` 返回固定画像 → 断言出现 3 张评委卡与按钮「开始答辩」；点击后导航到 `/session/:id`。

另写一例：上传 `.txt` 内容为空 → 显示「请粘贴或上传有效内容」，不调用画像。

- [ ] **Step 6: 实现 Material 与 JudgeCard**

页面两阶段：输入区（拖拽/选择文件、文本框、字数提示、隐私提示）→ 分析中（流式状态文案）→ 画像区（5 个要点 + 3 张评委卡 + 严格度回显 + 开始按钮）。`parseFile` 抛 `ParseError` 时按 code 显示对应提示：`no-text` → 「未识别到文本，请粘贴大纲」；`unsupported` → 「暂不支持该格式，请粘贴文本」；`corrupt` → 「文件解析失败，请粘贴文本」。

`JudgeCard` 展示头像（`onError` 时回退为首字圆形块）、名称、关注点、一句口头禅。

- [ ] **Step 7: 实现 Home**

首页包含：产品名、一句话价值主张「让评委的问题，先在你面前出现」、主按钮「立即预演」跳 `/setup`、次按钮「查看示例报告」跳 `/history`、3 张评委卡。此任务只做结构与文案，视觉打磨留到 Task 11。

- [ ] **Step 8: 运行测试确认通过**

Run: `npm test -- src/pages/Setup.test.tsx src/pages/Material.test.tsx src/lib/portrait.test.ts`
Expected: PASS。

- [ ] **Step 9: 提交**

```powershell
git add src/pages src/components src/lib/portrait.ts src/lib/portrait.test.ts src/App.tsx
git commit -m "feat: add home setup material and portrait flow"
```

---

### Task 8: 答辩室、计时器与 TTS

**Files:**
- Create: `src/hooks/useElapsedTimer.ts`, `src/hooks/useDefenseEngine.ts`
- Create: `src/lib/tts.ts`
- Create: `src/pages/Session.tsx`, `src/components/ChatBubble.tsx`, `src/components/Timer.tsx`, `src/components/MockBadge.tsx`
- Test: `src/hooks/useElapsedTimer.test.ts`, `src/lib/tts.test.ts`, `src/pages/Session.test.tsx`

**Interfaces:**
- Consumes: `useSessionStore`（Task 6）；`runTask`/`parseLooseJSON`（Task 4）；`buildPrompt` 不在前端使用；`consumeCall`/`canCallToday`（Task 6）。
- Produces:

```ts
export function useElapsedTimer(running: boolean): { seconds: number; reset(): void }
export function useDefenseEngine(): { busy: boolean; error: string | null; ask(): Promise<void>; answer(text: string): Promise<void>; hint(): Promise<string>; finish(): Promise<void> }
export function isSpeechSupported(): boolean
export function speak(text: string): void
export function stopSpeaking(): void
```

- [ ] **Step 1: 写失败的计时器测试**

用 `vi.useFakeTimers()`，`running=true` 后推进 3000ms，断言 `seconds === 3`；`reset()` 后为 0；`running=false` 时推进不增加。

- [ ] **Step 2: 实现计时器**

`useEffect` 每 1000ms 递增；`running` 变化时清理 interval；组件卸载清理。

- [ ] **Step 3: 写失败的 TTS 测试**

mock `window.speechSynthesis` 的 `speak`/`cancel` 与 `SpeechSynthesisUtterance` 构造器。断言 `speak('问题')` 调用一次且文本正确；`stopSpeaking()` 调用 `cancel`；`isSpeechSupported()` 在无 `speechSynthesis` 时为 false。

- [ ] **Step 4: 实现 TTS**

`lang = 'zh-CN'`、`rate = 1`；每次 `speak` 前先 `cancel`；不支持时静默返回。

- [ ] **Step 5: 写失败的答辩室测试**

mock `runTask`：`question` 返回 `{"judgeId":"method","text":"你的样本量为什么是 30？","intent":"方法严谨性","suggestedSeconds":90}`；`evaluate` 返回 `{"score":72,"dimensions":{"accuracy":70,"logic":75,"depth":70,"clarity":75},"comment":"结论清楚，证据不足","modelAnswer":"样本量依据...","followUp":null}`；`report` 返回 `{"dimensions":{"accuracy":72,"logic":78,"depth":70,"clarity":80},"summary":"整体合格","checklist":["补充样本量依据"],"topRisks":[{"question":"样本量为什么是 30？","reason":"证据不足"}],"questionReviews":[]}`。

断言：进入页面后出现问题文本；输入「因为 30 是经验值」提交后出现点评；输入「不知道」提交时出现「回答太短，请至少写 10 个字」且 `runTask` 未被再次调用；点击「结束并出报告」后导航到 `/report/:id`。

- [ ] **Step 6: 实现 useDefenseEngine**

`ask()`：若当前无问题或上一题已点评，调用 `runTask('question', payload)`，payload 含 `config`、`portrait`、`recentMessages`（最近 3 轮）、`followUpLevel`；解析后 `addQuestion` 并写入一条 `judge` 消息；`followUpLevel > 0` 时沿用上一题评委。选择新评委时检查最近两道题，同一评委不得连续出现 3 次。

`answer(text)`：长度 < 10 直接返回 `error='回答太短'`；否则 `answerQuestion`；调用 `runTask('evaluate', ...)` 拿分数与点评 → `evaluateQuestion`；若返回 `followUp` 且当前层级 < 2，继续 `ask()` 生成追问。

`hint()`：调用 `runTask('hint', ...)` 返回纯文本；`finish()`：调用 `runTask('report', ...)`，用 `parseLooseJSON<ReportModelOutput>` 解析后交给 `finalizeReport`（Task 2），失败重试一次，仍失败则按逐题平均分构造兜底输出；随后 `finish` 并导航 `/report/:id`。

每次真实调用前检查 `canCallToday()`，调用后 `consumeCall()`；捕获到 `source === 'mock'` 时 `setMockNotice(true)`。

- [ ] **Step 7: 实现答辩室 UI**

三栏：左侧材料要点（移动端折叠）、中间消息流与回答框（Enter 提交，Shift+Enter 换行）、右侧当前评委 + 计时 + 控制按钮（提示/跳过/结束）。TTS 开关在顶部，默认读 `localStorage['dr:tts'] === '1'`；开启后新问题自动朗读。显示 `MockBadge` 当 `mockNotice` 为真。

进入页面时读取 `useParams().id`，若 store 中的 session id 不一致则调用 `restore(id)`；恢复后从最后一条未点评的问题继续。单题计时超过 `suggestedSeconds` 时显示「已超时」标签，但不强制结束。

- [ ] **Step 8: 运行测试确认通过**

Run: `npm test -- src/hooks/useElapsedTimer.test.ts src/lib/tts.test.ts src/pages/Session.test.tsx`
Expected: PASS。

- [ ] **Step 9: 提交**

```powershell
git add src/hooks src/lib/tts.ts src/pages/Session.tsx src/components src/pages/Session.test.tsx
git commit -m "feat: add defense room timer and tts"
```

---

### Task 9: 报告页与导出

**Files:**
- Create: `src/pages/Report.tsx`, `src/components/ScoreRadar.tsx`
- Test: `src/pages/Report.test.tsx`

**Interfaces:**
- Consumes: `Report`、`Session`（Task 2）；`finalizeReport`（Task 2，已在 Task 8 接通）；`getSession`（Task 6）。
- Produces: 路由 `/report/:id` 的完整展示。

- [ ] **Step 1: 写失败的 Report 页测试**

mock `recharts` 为简单 div；准备一场含 6 题、总分为 82 的 session（含 report）存入 localStorage。断言页面显示总分 `82`、等级「良好」、6 条问题点评、「高危问题 Top 5」、「复盘清单」；点击「保存报告图片」调用被 mock 的 `toPng`。

- [ ] **Step 2: 实现报告页**

区块顺序：总分与等级 → 四维雷达 → 高危问题 Top 5 → 逐题点评（折叠展开）→ 复盘清单 → 操作（保存图片 / 再来一场）。保存图片用 `html-to-image` 的 `toPng(reportRef.current)` 并触发下载；失败时显示「导出失败，请截图保存」。找不到 session 时显示「报告不存在」并给出返回首页入口。

- [ ] **Step 3: 运行测试确认通过**

Run: `npm test -- src/pages/Report.test.tsx`
Expected: PASS。

- [ ] **Step 4: 提交**

```powershell
git add src/pages/Report.tsx src/components/ScoreRadar.tsx src/pages/Report.test.tsx
git commit -m "feat: add report page and image export"
```

---

### Task 10: 历史记录与演示场次

**Files:**
- Create: `src/pages/History.tsx`, `src/mocks/demo.ts`
- Modify: `src/App.tsx`
- Test: `src/pages/History.test.tsx`

**Interfaces:**
- Consumes: `loadSessions`/`deleteSession`/`clearSessions`（Task 6）；`Session`（Task 2）。
- Produces: `DEMO_SESSION: Session`；历史页路由 `/history`。

- [ ] **Step 1: 写失败的 History 测试**

预置两条 session（一条 finished 带报告、一条 ongoing），断言列表显示两条；点击「查看报告」导航到 `/report/:id`；点击「删除」后该条消失且 localStorage 同步；空列表显示「还没有预演记录」。

- [ ] **Step 2: 实现 History**

列表按时间倒序，显示类型、日期、总分/状态；操作：查看报告、继续（ongoing）、删除、清空全部（二次确认用 `window.confirm`）。

- [ ] **Step 3: 实现 DEMO_SESSION**

构造一场完整的本科毕设演示：画像、6 个问题、6 条回答、总分 82 的报告，id 固定 `demo-defense`，`createdAt` 固定值，所有文本为真实可读中文。首页「查看示例报告」在无历史时直接打开 `/report/demo-defense`；有历史时进 `/history`。

- [ ] **Step 4: 运行测试确认通过**

Run: `npm test -- src/pages/History.test.tsx`
Expected: PASS。

- [ ] **Step 5: 提交**

```powershell
git add src/pages/History.tsx src/mocks/demo.ts src/App.tsx src/pages/History.test.tsx
git commit -m "feat: add history and demo defense session"
```

---

### Task 11: 视觉打磨与响应式

**Files:**
- Modify: `src/styles/theme.css`, `src/pages/Home.tsx`, `src/pages/Session.tsx`, `src/pages/Report.tsx`, `src/components/*`
- Create: `public/judges/method.jpg`, `public/judges/innovation.jpg`, `public/judges/application.jpg`

**Interfaces:**
- Consumes: 所有页面。
- Produces: 390px 与 1440px 两档可用的最终界面。

- [ ] **Step 1: 生成并落地评委头像**

用 Trae 文生图接口下载 3 张方形头像到 `public/judges/`，提示词分别描述：严谨的中年男教授（深色学术背景、眼镜）、犀利的青年女学者（冷色调）、务实的行业专家（暖色调）。命令示例：

```powershell
curl.exe -L -o public/judges/method.jpg "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=photorealistic%20portrait%20of%20a%20stern%20middle-aged%20Chinese%20male%20professor%20with%20glasses%2C%20dark%20academic%20background%2C%20cinematic%20lighting&image_size=square"
```

若下载失败，保留 `JudgeCard` 的首字回退，不阻塞后续步骤。

- [ ] **Step 2: 应用视觉规范**

统一 token 使用；首页加入答辩台/聚光灯意象的 CSS 渐变与细网格背景；标题用衬线字体栈；按钮、卡片、输入框统一圆角与边框；动效仅用于评委卡入场与分数数字滚动。

- [ ] **Step 3: 响应式检查**

答辩室在 `<768px` 时改为单列：材料要点折叠为顶部抽屉，计时与当前评委固定在顶部，输入框吸底。报告页单列，雷达图容器高度 ≥ 260px。

- [ ] **Step 4: 人工验收**

Run: `npm run dev:vite`
用浏览器在 390×844 与 1440×900 下检查首页、建场、答辩、报告，确认无横向滚动、无遮挡、按钮可点。

- [ ] **Step 5: 构建并提交**

Run: `npm run build`
Expected: 退出码 0。

```powershell
git add -A
git commit -m "feat: polish visuals and responsive layouts"
```

---

### Task 12: 部署、README 与提交材料

**Files:**
- Create: `README.md`
- Modify: `netlify.toml`（如部署时需要）
- Create: `docs/submission/session-ids.md`

**Interfaces:**
- Consumes: 全部功能。
- Produces: 公网链接、部署说明、提交清单。

- [ ] **Step 1: 全量验证**

Run: `npm test`
Expected: 所有测试 PASS。

Run: `npm run build`
Expected: 退出码 0。

检查密钥未泄漏：

```powershell
Get-ChildItem dist -Recurse -File | Select-String -Pattern "sk-|MAAS_API_KEY"
```

Expected: 无匹配。

- [ ] **Step 2: 写 README**

结构：一句话介绍、在线体验（部署后填链接）、功能截图占位、核心流程、技术栈、本地运行（`npm i` → 复制 `.env.example` 为 `.env` → `npm run dev`）、环境变量说明、隐私说明（材料本地解析）、License。README 面向用户，不写内部排期。

- [ ] **Step 3: 部署 Netlify**

安装并登录 CLI 后：

```powershell
npx netlify deploy --build --prod
```

在 Netlify 后台设置 `MAAS_API_KEY` 与 `MAAS_BASE_URL`；确认 `/api/llm` 返回流式内容；把公网链接填入 README。

- [ ] **Step 4: 线上验收**

用浏览器打开公网链接，完成一场演示答辩（可用 mock 开关），确认首页、答辩、报告、移动端都正常；截图保存到 `docs/submission/`（首页、答辩中、报告各一张）。

- [ ] **Step 5: 记录 TRAE Session ID**

把开发过程中至少 3 个 TRAE 会话 ID 与对应完成内容写入 `docs/submission/session-ids.md`。

- [ ] **Step 6: 提交**

```powershell
git add -A
git commit -m "docs: add readme deployment guide and submission checklist"
git push -u origin main
```

---

## 自检记录

- Spec 覆盖：配置（Task 7）、解析（Task 3）、画像（Task 7）、答辩（Task 8）、报告聚合（Task 2）与报告页（Task 9）、历史（Task 10）、TTS（Task 8）、代理（Task 5）、配额（Task 6）、视觉（Task 11）、部署与材料（Task 12）。
- 类型一致性：`Session`/`Question`/`Report` 在 Task 2 定义，后续任务只引用不改名；`runTask` 签名在 Task 4 定义，Task 7/8 使用同一签名，Task 9 只读取已生成的 `Report`。
- Review Focus 对应测试：PPTX 异常（Task 3 Step 4/5）、PDF 无文本（Task 3 Step 6/7）、JSON 容错（Task 4 Step 3/4/5/6）、中途失败降级（Task 4 Step 5/6）、空回答与刷新恢复（Task 6 Step 5、Task 8 Step 5/6）。
