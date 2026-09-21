-- ═══════════════════════════════════════════════════════════
--  P2P Tracker — Infinity Changes
--  Supabase Schema (PostgreSQL + RLS)
-- ═══════════════════════════════════════════════════════════

-- ── Extensions ───────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── Profiles (linked to auth.users) ──────────────────────
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  full_name   text,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: owner read"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles: owner update"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── P2P Cycles ────────────────────────────────────────────
create table public.p2p_cycles (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  status        text not null default 'active' check (status in ('active', 'closed')),
  fiat          text not null default 'VES',
  exchange      text not null default 'binance' check (exchange in ('binance', 'bybit')),
  capital_fiat  numeric(20,2) not null default 0,
  capital_usdt  numeric(20,8) not null default 0,
  closed_fiat   numeric(20,2),
  profit_fiat   numeric(20,2),
  roi_pct       numeric(10,4),
  opened_at     timestamptz not null default now(),
  closed_at     timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.p2p_cycles enable row level security;

create policy "cycles: owner select"  on public.p2p_cycles for select  using (auth.uid() = user_id);
create policy "cycles: owner insert"  on public.p2p_cycles for insert  with check (auth.uid() = user_id);
create policy "cycles: owner update"  on public.p2p_cycles for update  using (auth.uid() = user_id);
create policy "cycles: owner delete"  on public.p2p_cycles for delete  using (auth.uid() = user_id);

-- ── P2P Trades ────────────────────────────────────────────
create table public.p2p_trades (
  id               uuid primary key default uuid_generate_v4(),
  cycle_id         uuid not null references public.p2p_cycles(id) on delete cascade,
  user_id          uuid not null references auth.users(id) on delete cascade,
  type             text not null check (type in ('buy', 'sell')),
  fiat             text not null default 'VES',
  exchange         text not null default 'binance',
  price            numeric(20,8) not null,
  usdt_amount      numeric(20,8) not null,
  fiat_amount      numeric(20,2) not null,
  commission_usdt  numeric(20,8) not null default 0,
  pay_method       text not null default '',
  notes            text,
  traded_at        timestamptz not null default now(),
  created_at       timestamptz not null default now()
);

alter table public.p2p_trades enable row level security;

create policy "trades: owner select"  on public.p2p_trades for select  using (auth.uid() = user_id);
create policy "trades: owner insert"  on public.p2p_trades for insert  with check (auth.uid() = user_id);
create policy "trades: owner update"  on public.p2p_trades for update  using (auth.uid() = user_id);
create policy "trades: owner delete"  on public.p2p_trades for delete  using (auth.uid() = user_id);

-- ── updated_at trigger ────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_cycles_updated_at
  before update on public.p2p_cycles
  for each row execute function public.set_updated_at();

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ── Indexes ───────────────────────────────────────────────
create index idx_cycles_user_id    on public.p2p_cycles(user_id);
create index idx_cycles_status     on public.p2p_cycles(status);
create index idx_trades_user_id    on public.p2p_trades(user_id);
create index idx_trades_cycle_id   on public.p2p_trades(cycle_id);
create index idx_trades_type       on public.p2p_trades(type);
