-- 0003 AI 用量表：服务端记账，支撑配额与会员额度（可重复执行）
-- 写入方：Netlify Function（service_role，绕过 RLS）；普通用户只读自己的记录

create table if not exists public.llm_usage (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  endpoint text not null,
  model text,
  prompt_tokens integer not null default 0 check (prompt_tokens >= 0),
  completion_tokens integer not null default 0 check (completion_tokens >= 0),
  created_at timestamptz not null default now()
);

create index if not exists llm_usage_user_created_idx
  on public.llm_usage (user_id, created_at desc);

alter table public.llm_usage enable row level security;

drop policy if exists "llm_usage_select_own" on public.llm_usage;
create policy "llm_usage_select_own" on public.llm_usage
  for select using (auth.uid() = user_id);

revoke all on public.llm_usage from anon;
revoke all on public.llm_usage from authenticated;
grant select on public.llm_usage to authenticated;
