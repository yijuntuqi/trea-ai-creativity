# 答辩预演官

> 让评委的问题，先在你面前出现。

上传论文、开题报告或 PPT 大纲，三位不同风格的 AI 评委轮流追问，结束后自动生成四维评分与可执行的复盘清单。所有内容都能定位回你的材料原文。

## 在线体验

https://trea-ai-creativity-p4nr.netlify.app/

本地预览：

```powershell
npm i
Copy-Item .env.example .env
# 在 .env 中填入 MAAS_API_KEY
npm run dev
```

## 核心流程

1. **建场**：选择答辩类型、学科、严格度与限时。
2. **上传材料**：支持 PDF、PPTX 与纯文本粘贴；文件只在浏览器内解析，不会上传。
3. **生成画像**：自动提炼题目、研究问题、方法、创新点、证据与局限。
4. **多评委追问**：方法论派、创新性质疑派、应用价值派轮流提问，支持最多两层追问。
5. **复盘报告**：四维评分（内容准确性、逻辑结构、应答深度、表达清晰）、高危问题 Top 5、逐题点评与参考话术、复盘清单。

答辩过程中可随时请求提示、跳过当前题，或直接结束并出报告。报告支持导出为图片。

## 技术栈

- 前端：React 19、TypeScript、Vite、Tailwind CSS v4、React Router、Zustand、Recharts、Framer Motion
- 材料解析：pdfjs-dist、jszip（全部在浏览器本地完成）
- 模型代理：Netlify Function（`/api/llm`）代理阿里云 MaaS 的 OpenAI 兼容流式接口
- 测试：Vitest + Testing Library

## 本地运行

```powershell
npm i
Copy-Item .env.example .env
npm run dev
```

- `npm run dev`：使用 Netlify Dev 同时启动前端与 `/api/llm` 函数。
- `npm run dev:vite`：仅启动前端；没有后端时会自动降级为演示模式。
- `npm test`：运行全部测试。
- `npm run build`：类型检查并构建。

### 环境变量

| 变量 | 说明 |
| --- | --- |
| `MAAS_API_KEY` | 阿里云 MaaS API Key，仅配置在本地 `.env` 或 Netlify 环境变量中 |
| `MAAS_BASE_URL` | MaaS 兼容接口基址 |
| `VITE_DEMO_MODE` | 设为 `1` 时强制使用演示模式 |

没有配置 Key 或调用失败时，应用会自动降级为演示模式，界面显示「演示模式」标识，流程不会中断。为保护 API 额度，前端内置每日调用上限与缓存策略。

## 部署到 Netlify

仓库内置 `netlify.toml`：

- 构建命令：`npm run build`
- 发布目录：`dist`
- 函数目录：`netlify/functions`

在 Netlify 站点设置中添加 `MAAS_API_KEY` 与 `MAAS_BASE_URL` 环境变量后重新部署即可。接口路径 `/api/llm` 会由重定向规则转发到 Functions。

## 隐私说明

- 论文、PPT 等材料只在浏览器内解析，不上传服务器。
- 仅将截断后的文本片段发送给模型用于提问与点评。
- 会话与报告默认保存在本机 localStorage，可随时在历史记录中删除或清空。

## License

本项目用于 TRAE AI 全国大学生创造力大赛参赛与学习交流。未经作者许可，请勿用于商业用途。
