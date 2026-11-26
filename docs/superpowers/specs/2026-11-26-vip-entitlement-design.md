# VIP 权益体系设计 Spec

日期：2026-11-26
状态：待评审
关联：答辩预演官（TRAE AI 全国大学生创造力大赛参赛作品）

## 1. 目标

在不接入真实支付通道的前提下，建立可演示、可运营的会员体系：

- 免费用户获得一次带文件的完整答辩体验（有大小限制）。
- VIP 用户不限次上传、放宽文件大小、可使用 GitHub 公开仓库导入。
- 付费入口为「扫码 + 提交订单号」，管理员在数据库改一次状态即自动开通，到期自动失效。

成功标准：免费额度无法通过前端绕过（登录用户）；VIP 权益前后端一致生效；订单从提交到开通全链路可演示；不引入真实资金流。

## 2. 范围

### 本期做

1. 权益判定与免费额度（文件大小、一次上传）。
2. 账号页权益状态与剩余额度展示。
3. VIP 套餐页、订单提交、管理员改状态后触发器自动开通。
4. GitHub 公开仓库导入（README + 顶层目录，20k 字符上限）。
5. 历史记录对免费用户的限制。
6. 演示模式开关 `VITE_VIP_DEMO`。

### 本期不做

- 真实支付网关（微信/支付宝 SDK）。
- 私有仓库导入、GitHub OAuth 授权。
- 按 token 计费的额度体系（`llm_usage` 仅保留为基础设施）。
- 退款、发票、多币种。

## 3. 权益矩阵

| 能力 | 未登录 | 免费（登录） | VIP |
|---|---|---|---|
| 建场、纯文本材料答辩 | 不限 | 不限 | 不限 |
| 上传文件（数量） | 不限 | 不限 | 不限 |
| 单文件大小 | 5MB | 5MB | 20MB |
| 单场累计大小 | 10MB | 10MB | 50MB |
| 带文件的答辩场次 | 本机 1 次 | 1 次（服务端记录） | 不限 |
| GitHub 仓库导入 | 否 | 否 | 是 |
| 报告导出全部格式 | 是 | 是 | 是 |

免费「一次」的口径：绑定一场答辩。点击「开始答辩」时领取额度并锁定；该场结束后，历史记录仅可查看报告与导出，不可再次上传，也不可「再练一场」带材料重来。

未登录用户仅做本机限制（localStorage），清缓存可绕过；文件解析本身在浏览器内完成，不做服务端拦截。登录用户为服务端强校验。

## 4. 数据模型（迁移 0004）

```sql
alter table public.profiles
  add column if not exists free_upload_used_at timestamptz,
  add column if not exists free_upload_session_id text;

create table if not exists public.vip_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  plan_code text not null check (plan_code in ('month', 'quarter', 'year')),
  amount_cents integer not null check (amount_cents > 0),
  order_no text not null unique,
  contact text,
  note text,
  status text not null default 'pending' check (status in ('pending', 'paid', 'rejected')),
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create unique index if not exists vip_orders_one_pending
  on public.vip_orders (user_id) where status = 'pending';
```

RLS 与权限：

- `vip_orders`：用户可 `select` 自己的、可 `insert` 自己的（只能 `pending`）；不授予 `update` / `delete`。管理员通过 Dashboard 或 service_role 改状态。
- `profiles`：沿用 0002 的列级授权，`plan` / `vip_expires_at` / `free_upload_*` 用户不可写。

函数：

- `public.is_vip()`：`security definer`，判断 `plan='vip'` 且 `vip_expires_at is null or vip_expires_at > now()`。
- `public.claim_free_upload(p_session_id text)`：`security definer`，VIP 直接返回允许；免费用户若 `free_upload_used_at` 为空则写入并返回允许，否则拒绝。
- `public.apply_vip_order()`：`vip_orders` 更新触发器，`pending → paid` 时按套餐延长 `vip_expires_at`（月 30 天 / 季 90 天 / 年 365 天），并写 `paid_at`。

## 5. 前端结构

新增/修改：

- `src/lib/entitlement.ts`：纯函数，大小限制常量、校验、套餐定义、权益文案。可单测。
- `src/store/auth.ts`：登录后读取自己的 `profiles`，暴露 `profile`、`isVip`、`refreshProfile()`。
- `src/lib/orders.ts`：创建订单、查询我的订单。
- `src/pages/Vip.tsx`：套餐、收款二维码（演示模式隐藏）、订单号提交、我的订单状态。
- `src/pages/Material.tsx`：上传前校验大小与免费额度；开始答辩前调用 `claim_free_upload`；GitHub 导入入口（VIP）。
- `src/pages/Account.tsx`：权益状态、到期时间、免费额度剩余。
- `src/pages/History.tsx`：免费用户已用额度时，「再练一场」替换为升级提示。
- `src/lib/github.ts`：仓库 URL 解析（纯函数，可单测）。

本地存储：`dr:free-upload-used`（记录 sessionId），仅用于未登录用户。

演示模式：`VITE_VIP_DEMO === 'true'` 时隐藏真实收款码、页面标注「演示环境」，订单仍正常写入数据库。默认示例环境开启，生产可关闭。

## 6. GitHub 导入

新增 `netlify/functions/github-import.ts`：

- 入参：`{ repoUrl }`，请求头带用户 Supabase access token。
- 校验：用 anon key + 用户 JWT 调用 `rpc/is_vip`，非 VIP 返回 403。
- URL 白名单：仅 `https://github.com/{owner}/{repo}`，owner/repo 匹配 `^[A-Za-z0-9._-]{1,100}$`，拒绝其他域与路径。
- 抓取：`/repos/{owner}/{repo}`（简介、语言）、`/readme`（Raw）、`/contents`（顶层）。
- 合成：README 优先，剩余配额给目录与简介，总长 20000 字符，超出截断并标注。
- 缓存：同一仓库 1 小时；不保存任何 token；GitHub 403/404 明确提示「仅支持公开仓库」。
- 返回：`{ text, repo, truncated }`，前端填入材料文本框并标注来源。

## 7. 订单与开通流程

1. 用户选择套餐 → 扫码付款 → 填订单号与联系方式 → 插入 `vip_orders(pending)`。
2. 页面提示「管理员核对后 1 个工作日内开通」。
3. 管理员在 Table Editor 将 `status` 改为 `paid`。
4. 触发器延长 `vip_expires_at`，用户刷新账号页即可看到 VIP。
5. 拒绝时改 `rejected`，用户可重新提交。

防刷：同一用户仅一条 `pending`（部分唯一索引）；`order_no` 全局唯一。

## 8. 错误与边界

- 超出大小：上传即提示具体限制与升级入口，不消耗免费额度。
- 领取额度 RPC 失败：阻断开始并提示重试，不静默放行。
- 未登录用尽额度：提示登录后额度独立，避免误以为清缓存可无限使用。
- VIP 到期：`is_vip()` 实时判断，前端展示「已过期」，不删除历史能力。
- GitHub 抓取超时/限流：返回明确文案，材料框内容不受影响。

## 9. 测试

- 单测：`entitlement`（各角色大小与额度分支）、`github` URL 解析与截断、订单表单校验。
- 组件测试：Material 超限提示、免费额度用尽提示、History 按钮替换、Vip 页演示模式隐藏收款码。
- 手动验证：SQL 执行后，用两个账号分别验证 RPC 返回与 RLS 拒绝。
- 浏览器验收：免费一次 → 用尽提示 → 提交订单 → 后台改 paid → 刷新变 VIP → 导入仓库 → 大文件可传。

## 10. 交付顺序

1. 迁移 0004（用户执行）。
2. 权益库 + 登录态 profile 读取。
3. 材料页大小与次数限制。
4. VIP 页 + 订单 + 演示开关。
5. GitHub 导入函数与入口。
6. 历史限制、权益展示。
7. 测试、构建、提交推送；Netlify 额度恢复后部署。

## 11. 风险

- 赛事合规：演示模式避免真实收款与商业推广嫌疑；如需真实收款，仅切换环境变量并自行承担交易合规。
- 匿名绕过：已声明为本机限制，不做服务端拦截。
- GitHub 匿名 API 限流 60 次/小时：靠缓存缓解，必要时服务端配置只读 token（需用户提供）。
