# 答辩预演官

> 让评委的问题，先在你面前出现。

上传论文、开题报告或 PPT 大纲，三位不同风格的 AI 评委轮流追问，结束后自动生成四维评分、逐题点评与可执行的复盘清单。所有点评都能定位回你的材料原文。

## 在线体验

https://trea-ai-creativity-p4nr.netlify.app/

无需登录即可直接体验；不登录时记录只存在本机，登录后自动同步到云端。

本地预览：

```powershell
npm i
Copy-Item .env.example .env
# 在 .env 中填入 MAAS_API_KEY
npm run dev
```

## 核心流程

1. **建场**：选择答辩类型（开题 / 中期 / 毕业 / 自定义）、学科、严格度、目标题量与限时，可自选参与评委。
2. **上传材料**：支持 PDF、PPTX、Word、Excel、Markdown、JSON、CSV、TXT 多文件上传，也可直接粘贴文本。文件只在浏览器内解析，原文不上传。
3. **生成画像**：自动提炼研究问题、方法、创新点、关键证据与局限。
4. **多评委追问**：方法论派、创新性质疑派、应用价值派轮流提问，支持最多两层追问，可随时请求提示或跳过。
5. **复盘报告**：四维评分（内容准确性、逻辑结构、应答深度、表达清晰）、高危问题 Top 5、逐题点评与可照读参考话术、复盘清单。
6. **导出与沉淀**：报告支持 PNG / JPG / PDF / Word / Markdown 导出，默认展开全部逐题点评；历史记录可回看、可「再练一场」。

## 账号与会员

- **免登录**：全部核心功能可用，记录存在浏览器 localStorage。
- **登录**（邮箱验证或 GitHub）：历史记录与材料文本双向同步到云端，换设备可继续。
- **免费额度**：带文件答辩可体验 1 次，单文件 ≤5MB、单场累计 ≤10MB；纯文本答辩不限次。
- **VIP**：单文件 20MB、单场累计 50MB、带文件答辩不限次、支持导入 GitHub 公开仓库（README + 顶层目录，最多 2 万字符）。
- 默认演示模式（`VITE_VIP_DEMO=true`）不展示真实收款码，权益与订单流程仍可完整演示。

## 技术栈

- 前端：React 19、TypeScript、Vite、Tailwind CSS v4、React Router、Zustand、Recharts、Framer Motion
- 材料解析：pdfjs-dist、jszip、xlsx（全部在浏览器本地完成）
- 模型代理：Netlify Function `/api/llm` 代理阿里云 MaaS 的 OpenAI 兼容流式接口，密钥不下发前端
- 仓库导入：Netlify Function `/api/github-import`，仅公开仓库，VIP 校验走后端
- 数据：Supabase（Auth + Postgres + RLS）
- 测试：Vitest + Testing Library（27 个文件、110 个用例）

## 本地运行

```powershell
npm i
Copy-Item .env.example .env
npm run dev
```

- `npm run dev`：启动前端开发服务器，`/api/*` 会代理到 `VITE_PROXY_SITE` 或线上函数。
- `npm test`：运行全部测试。
- `npm run build`：类型检查并构建。

### 环境变量

| 变量 | 说明 |
| --- | --- |
| `MAAS_API_KEY` | 阿里云 MaaS API Key，只配置在本地 `.env` 或部署平台环境变量 |
| `MAAS_BASE_URL` | MaaS 兼容接口基址 |
| `VITE_DEMO_MODE` | 设为 `1` 时强制使用演示模式 |
| `VITE_VIP_DEMO` | `true`（默认）隐藏收款码并标注演示环境，正式收款时设为 `false` |
| `VITE_SUPABASE_URL` | Supabase 项目地址，未配置时账号功能隐藏、记录只存本机 |
| `VITE_SUPABASE_ANON_KEY` | Supabase publishable key |

没有配置 Key 或调用失败时，应用会自动降级为演示模式，界面显示「演示模式」标识，流程不会中断。为保护 API 额度，前端内置每日调用上限与缓存策略。

## 部署到 Netlify

仓库内置 `netlify.toml`：

- 构建命令：`npm run build`
- 发布目录：`dist`
- 函数目录：`netlify/functions`
- `SECRETS_SCAN_OMIT_KEYS`：排除 MaaS 与 Supabase 的非敏感地址变量，避免 Secrets Scan 污染

在站点设置中配置上表环境变量后即可部署。`/api/*` 由重定向规则转发到 Functions。

Supabase 侧需要执行 `supabase/migrations/` 下的迁移，并在 Authentication → URL Configuration 中把线上域名加入 Site URL 与 Redirect URLs。

## 隐私说明

- 论文、PPT 等材料只在浏览器内解析，原始文件不上传。
- 仅将文本内容发送给模型用于提问与点评，不做截断。
- 会话与报告默认保存在本机 localStorage，可随时删除；登录后同步到自己的 Supabase 账号，行级安全策略保证只有本人可读写。

## License

本项目用于 TRAE AI 全国大学生创造力大赛参赛与学习交流。未经作者许可，请勿用于商业用途。
