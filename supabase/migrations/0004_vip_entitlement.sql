-- 0004 VIP 权益体系：免费额度、订单表、开通触发器（可重复执行）
-- 依赖：public.profiles（0002）、public.set_updated_at()（0001）

alter table public.profiles
  add column if not exists free_upload_used_at timestamptz,
  add column if not exists free_upload_session_id text;

create table if not exists public.vip_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  plan_code text not null check (plan_code in ('month', 'quarter', 'year')),
  amount_cents integer not null check (amount_cents > 0),
  order_no text not null unique check (char_length(order_no) between 4 and 64),
  contact text check (contact is null or char_length(contact) <= 120),
  note text check (note is null or char_length(note) <= 500),
  status text not null default 'pending' check (status in ('pending', 'paid', 'rejected')),
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

-- 同一用户同时只允许一条待核对订单，避免重复提交
create unique index if not exists vip_orders_one_pending
  on public.vip_orders (user_id) where status = 'pending';

create index if not exists vip_orders_user_created_idx
  on public.vip_orders (user_id, created_at desc);

alter table public.vip_orders enable row level security;

drop policy if exists "vip_orders_select_own" on public.vip_orders;
drop policy if exists "vip_orders_insert_own" on public.vip_orders;

create policy "vip_orders_select_own" on public.vip_orders
  for select using (auth.uid() = user_id);

-- 只能提交自己的待核对订单；状态、金额以外的字段由数据库约束兜底
create policy "vip_orders_insert_own" on public.vip_orders
  for insert with check (auth.uid() = user_id and status = 'pending');

revoke all on public.vip_orders from anon;
revoke all on public.vip_orders from authenticated;
grant select, insert on public.vip_orders to authenticated;

-- 当前用户是否为有效期内的 VIP
create or replace function public.is_vip()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and plan = 'vip'
      and (vip_expires_at is null or vip_expires_at > now())
  );
$$;

revoke all on function public.is_vip() from public;
grant execute on function public.is_vip() to authenticated;

-- 领取免费上传额度：一场答辩只能领取一次；VIP 不受限
create or replace function public.claim_free_upload(p_session_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  prof public.profiles%rowtype;
begin
  if me is null then
    return jsonb_build_object('allowed', false, 'reason', 'unauthenticated');
  end if;

  if p_session_id is null or char_length(p_session_id) < 1 or char_length(p_session_id) > 64 then
    return jsonb_build_object('allowed', false, 'reason', 'bad_session');
  end if;

  select * into prof from public.profiles where id = me;
  if not found then
    return jsonb_build_object('allowed', false, 'reason', 'no_profile');
  end if;

  if prof.plan = 'vip' and (prof.vip_expires_at is null or prof.vip_expires_at > now()) then
    return jsonb_build_object('allowed', true, 'reason', 'vip');
  end if;

  if prof.free_upload_used_at is not null then
    return jsonb_build_object(
      'allowed', false,
      'reason', 'used',
      'sessionId', prof.free_upload_session_id
    );
  end if;

  -- 并发下只允许一次成功：条件更新保证幂等
  update public.profiles
    set free_upload_used_at = now(),
        free_upload_session_id = p_session_id
    where id = me and free_upload_used_at is null;

  if not found then
    return jsonb_build_object('allowed', false, 'reason', 'used');
  end if;

  return jsonb_build_object('allowed', true, 'reason', 'free');
end;
$$;

revoke all on function public.claim_free_upload(text) from public;
grant execute on function public.claim_free_upload(text) to authenticated;

-- 订单状态改为 paid 时自动延长 VIP 有效期
create or replace function public.apply_vip_order()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  add_days integer;
  base_at timestamptz;
begin
  if new.status = 'paid' and old.status is distinct from 'paid' then
    add_days := case new.plan_code
      when 'month' then 30
      when 'quarter' then 90
      when 'year' then 365
      else 30
    end;

    select greatest(coalesce(vip_expires_at, now()), now())
      into base_at
      from public.profiles
      where id = new.user_id;

    update public.profiles
      set plan = 'vip',
          vip_expires_at = coalesce(base_at, now()) + (add_days || ' days')::interval
      where id = new.user_id;

    new.paid_at := now();
  end if;

  return new;
end;
$$;

drop trigger if exists vip_orders_apply on public.vip_orders;
create trigger vip_orders_apply
  before update on public.vip_orders
  for each row execute function public.apply_vip_order();
