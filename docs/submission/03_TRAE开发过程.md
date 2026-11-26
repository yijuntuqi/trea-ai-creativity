# TRAE 开发过程

作品：答辩预演官（Defense Rehearsal）
线上：https://trea-ai-creativity-p4nr.netlify.app/
仓库：https://github.com/yijuntuqi/trea-ai-creativity

## 一、开发阶段

| 阶段 | 时间 | 主要工作 | 可回溯证据 |
| --- | --- | --- | --- |
| 立意与设计 | 11.24 | 确认痛点、拆需求、写设计文档与实施计划 | Session 3、`docs/superpowers/specs/` |
| 主流程开发 | 11.24–11.25 | 建场、材料解析、画像、三评委提问、点评、报告 | Session 2、commit `4a992b1` 之前一串 |
| 上线与排障 | 11.25 | Netlify 部署、Secrets Scan 污染修复、思考模式超时修复 | Session 2、commit 记录 |
| 第二轮整改 | 11.25 | 视觉升级、多格式材料、报告整页导出、历史续答 | Session 2 |
| 账号与云端同步 | 11.26 | Supabase 邮箱/GitHub 登录、忘记密码、本地↔云端同步 | commit `5183587`、`95c3c20` |
| 报告导出增强 | 11.26 | PNG/JPG/PDF/Word/Markdown，默认展开逐题点评 | commit `97b1ac4`、`532009b` |
| VIP 权益体系 | 11.26 | 免费额度、订单开通、GitHub 仓库导入、演示模式 | commit `4a992b1`、`e0b8423` |
| 迁移新站点与验收 | 11.26 | 新 Netlify 账号部署、线上 7 项浏览器验收、报告模型修复 | commit `26ffc02`、`f133e7c`、`71f59de`、Session 1 |

## 二、Session ID

赛事要求提交不少于 3 个关键任务的 Session ID。以下 3 个对应真实开发工作：

| # | Session ID | 对应工作 |
| --- | --- | --- |
| 1 | 【待填：当前会话 ID】 | 参赛材料整理、线上功能验收、报告模型与高危问题修复 |
| 2 | `4255543886886217:5ca944a9b9cbe7b91de8611c49b20ba0_6b0580fac22e2ba596db2b05.6b06831cffb6437decea7406.6b06831bffb6437decea7404:TraeCode CN.3.3.88.no_sid.no_ppe.T(2026/11/25 14:41:32)` | 主流程开发、Netlify 部署与超时排障、第二轮整改 |
| 3 | `6b0580fac22e2ba596db2b05` | 项目立意、需求梳理、设计与实施计划 |

**怎么拿当前会话 ID**：在 TRAE Chat 面板双击当前对话的任务标题，复制弹出的 Session ID，替换表格第 1 行。

## 三、需要你自己截的图（≥3 张，建议 5 张）

放到 `05_TRAE过程截图/` 目录，命名与下表一致，正文按顺序插入：

| 文件名 | 截图内容 | 怎么截 |
| --- | --- | --- |
| `01-需求与设计对话.png` | 与 TRAE 讨论立意、拆需求、确认方案的对话 | 打开历史会话，滚动到设计确认那几轮 |
| `02-主流程开发对话.png` | 实现建场/提问/报告时修改文件的对话 | 同上，挑含有文件改动的轮次 |
| `03-测试与构建结果.png` | 终端里 `npm test` 110 passed 与 `npm run build` 成功 | 本地跑一次，截终端 |
| `04-线上问题排查.png` | 排查「点评全变模板文案」或「报告模型不存在」的对话 | 挑定位问题的轮次 |
| `05-VIP权益开发.png` | 实现免费额度、订单、GitHub 导入的对话 | 挑改动最多的轮次 |

截图注意：遮掉与本作品无关的个人信息；保留对话里的「文件路径 / 命令 / 结果」，这最能证明是真实开发。

## 四、可验证的技术证据（评审可自行核查）

- **仓库提交记录**：`git log` 可见每个阶段的 commit，信息为中文且对应功能。
- **测试**：`npm test` → 27 个测试文件、110 个用例全部通过。
- **构建**：`npm run build` → TypeScript 类型检查 + Vite 构建成功。
- **线上验证**：
  - `/api/llm` 返回 `text/event-stream`，关闭思考模式后单次 5–8 秒；
  - `/api/github-import` 未登录返回 401，非 VIP 返回 403；
  - 免费额度由 Supabase RPC `claim_free_upload` 服务端强校验，清缓存无法绕过。
- **隐私设计**：PDF/PPTX/Word 等材料使用 pdfjs-dist / jszip / xlsx 在浏览器内解析，原始文件不出本机。

## 五、踩坑记录（可直接写进帖子）

1. **Secrets Scan 污染环境变量**：Netlify 扫描到 base URL 时把变量值替换成告警文本，导致函数请求一个不存在的地址并返回 502。解决：`netlify.toml` 里用 `SECRETS_SCAN_OMIT_KEYS` 排除，同时在函数里做合法性校验与兜底。
2. **模型思考模式撞上 Serverless 超时**：qwen3.8 默认开思考模式，单次点评 40 秒以上，超过函数超时被降级成模板文案。解决：请求体加 `enable_thinking: false`，耗时降到 5–8 秒。
3. **模型名写错导致报告全兜底**：报告任务用了工作区里不存在的 `qwen3.8-plus`，上游返回 `model_not_found`，前端重试两次后走了兜底报告。解决：报告统一用 `qwen3.8-flash`，并把「高危问题里的题目 ID」还原成题目原文。
