-- Budget Tracker schema
-- Run this in Supabase SQL editor (Project -> SQL Editor -> New query)

create extension if not exists "pgcrypto";

create table if not exists budget_months (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  month text not null, -- 'YYYY-MM'
  created_at timestamptz not null default now(),
  unique (user_id, month)
);

create table if not exists budget_slots (
  id uuid primary key default gen_random_uuid(),
  month_id uuid not null references budget_months(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  type text not null default 'expense' check (type in ('income','expense')),
  budget_limit numeric not null default 0,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid not null references budget_slots(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  amount numeric not null check (amount > 0),
  note text default '',
  tx_date date not null default current_date,
  source text not null default 'manual' check (source in ('manual','ai')),
  created_at timestamptz not null default now()
);

create index if not exists idx_budget_slots_month on budget_slots(month_id);
create index if not exists idx_transactions_slot on transactions(slot_id);
create index if not exists idx_budget_months_user on budget_months(user_id);

alter table budget_months enable row level security;
alter table budget_slots enable row level security;
alter table transactions enable row level security;

drop policy if exists "months_select_own" on budget_months;
drop policy if exists "months_insert_own" on budget_months;
drop policy if exists "months_update_own" on budget_months;
drop policy if exists "months_delete_own" on budget_months;
create policy "months_select_own" on budget_months for select using (auth.uid() = user_id);
create policy "months_insert_own" on budget_months for insert with check (auth.uid() = user_id);
create policy "months_update_own" on budget_months for update using (auth.uid() = user_id);
create policy "months_delete_own" on budget_months for delete using (auth.uid() = user_id);

drop policy if exists "slots_select_own" on budget_slots;
drop policy if exists "slots_insert_own" on budget_slots;
drop policy if exists "slots_update_own" on budget_slots;
drop policy if exists "slots_delete_own" on budget_slots;
create policy "slots_select_own" on budget_slots for select using (auth.uid() = user_id);
create policy "slots_insert_own" on budget_slots for insert with check (auth.uid() = user_id);
create policy "slots_update_own" on budget_slots for update using (auth.uid() = user_id);
create policy "slots_delete_own" on budget_slots for delete using (auth.uid() = user_id);

drop policy if exists "tx_select_own" on transactions;
drop policy if exists "tx_insert_own" on transactions;
drop policy if exists "tx_update_own" on transactions;
drop policy if exists "tx_delete_own" on transactions;
create policy "tx_select_own" on transactions for select using (auth.uid() = user_id);
create policy "tx_insert_own" on transactions for insert with check (auth.uid() = user_id);
create policy "tx_update_own" on transactions for update using (auth.uid() = user_id);
create policy "tx_delete_own" on transactions for delete using (auth.uid() = user_id);
