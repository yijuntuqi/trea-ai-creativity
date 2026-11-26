-- 0001 答辩会话表：企业级加固（可重复执行）
-- 用途：会话数据、RLS、索引、updated_at 由数据库维护

create table if not exists public.defense_sessions (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

-- 审计字段（先加可空列，回填后再收紧，避免影响已有数据）
alter table public.defense_sessions add column if not exists created_at timestamptz;
update public.defense_sessions
  set created_at = coalesce(updated_at, now())
  where created_at is null;
alter table public.defense_sessions alter column created_at set default now();
alter table public.defense_sessions alter column created_at set not null;

alter table public.defense_sessions
  add column if not exists payload_version integer not null default 1;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'defense_sessions_id_len') then
    alter table public.defense_sessions
      add constraint defense_sessions_id_len check (char_length(id) between 1 and 64);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'defense_sessions_payload_object') then
    alter table public.defense_sessions
      add constraint defense_sessions_payload_object check (jsonb_typeof(payload) = 'object');
  end if;

  if not exists (select 1 from pg_constraint where conname = 'defense_sessions_payload_size') then
    alter table public.defense_sessions
      add constraint defense_sessions_payload_size check (pg_column_size(payload) <= 4194304);
  end if;
end $$;

create index if not exists defense_sessions_user_updated_idx
  on public.defense_sessions (user_id, updated_at desc);

-- updated_at 统一由数据库维护，不信任客户端时间
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists defense_sessions_set_updated_at on public.defense_sessions;
create trigger defense_sessions_set_updated_at
  before insert or update on public.defense_sessions
  for each row execute function public.set_updated_at();

alter table public.defense_sessions enable row level security;

drop policy if exists "own_sessions_select" on public.defense_sessions;
drop policy if exists "own_sessions_insert" on public.defense_sessions;
drop policy if exists "own_sessions_update" on public.defense_sessions;
drop policy if exists "own_sessions_delete" on public.defense_sessions;

create policy "own_sessions_select" on public.defense_sessions
  for select using (auth.uid() = user_id);
create policy "own_sessions_insert" on public.defense_sessions
  for insert with check (auth.uid() = user_id);
create policy "own_sessions_update" on public.defense_sessions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own_sessions_delete" on public.defense_sessions
  for delete using (auth.uid() = user_id);

-- 纵深防御：匿名角色不持有任何表权限
revoke all on public.defense_sessions from anon;
grant select, insert, update, delete on public.defense_sessions to authenticated;
