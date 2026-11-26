-- 0002 用户档案表：昵称、头像、会员等级（可重复执行）
-- 依赖：public.set_updated_at()（0001 已创建）

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  plan text not null default 'free' check (plan in ('free', 'vip')),
  vip_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_plan_idx on public.profiles (plan);

-- 注册后自动建档案（含 GitHub OAuth 用户）
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'user_name',
      split_part(coalesce(new.email, ''), '@', 1)
    ),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 回填已经存在的账号
insert into public.profiles (id, email, display_name, avatar_url)
select
  u.id,
  u.email,
  coalesce(
    u.raw_user_meta_data ->> 'full_name',
    u.raw_user_meta_data ->> 'user_name',
    split_part(coalesce(u.email, ''), '@', 1)
  ),
  u.raw_user_meta_data ->> 'avatar_url'
from auth.users u
on conflict (id) do nothing;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- 用户只能改昵称和头像；plan / vip_expires_at 只能由服务端（service_role）修改
revoke all on public.profiles from anon;
revoke all on public.profiles from authenticated;
grant select on public.profiles to authenticated;
grant update (display_name, avatar_url) on public.profiles to authenticated;
