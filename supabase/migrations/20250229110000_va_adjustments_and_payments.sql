-- VA adjustments: bonuses and debits (separate from payments; do not treat debit as "paid")
create table if not exists public.va_adjustments (
  id uuid primary key default gen_random_uuid(),
  va_id uuid not null references public.profiles(id) on delete cascade,
  amount_cents integer not null,
  type text not null check (type in ('bonus', 'debit')),
  note text,
  created_at timestamptz default now(),
  created_by uuid references public.profiles(id)
);

alter table public.va_adjustments enable row level security;

drop policy if exists "va_adjustments_admin_all" on public.va_adjustments;
create policy "va_adjustments_admin_all"
  on public.va_adjustments for all
  using (public.current_user_role() = 'admin');

drop policy if exists "va_adjustments_va_select_own" on public.va_adjustments;
create policy "va_adjustments_va_select_own"
  on public.va_adjustments for select
  using (va_id = auth.uid());

-- VA payments: actual payouts sent (record when you pay a VA)
create table if not exists public.va_payments (
  id uuid primary key default gen_random_uuid(),
  va_id uuid not null references public.profiles(id) on delete cascade,
  amount_cents integer not null,
  note text,
  paid_at timestamptz not null default now(),
  created_by uuid references public.profiles(id)
);

alter table public.va_payments enable row level security;

drop policy if exists "va_payments_admin_all" on public.va_payments;
create policy "va_payments_admin_all"
  on public.va_payments for all
  using (public.current_user_role() = 'admin');

drop policy if exists "va_payments_va_select_own" on public.va_payments;
create policy "va_payments_va_select_own"
  on public.va_payments for select
  using (va_id = auth.uid());

-- Migrate existing data from va_payout_adjustments to va_adjustments
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'va_payout_adjustments') then
    insert into public.va_adjustments (va_id, amount_cents, type, note, created_at, created_by)
    select va_id, amount_cents, type, note, created_at, created_by from public.va_payout_adjustments;
    drop table public.va_payout_adjustments;
  end if;
end $$;
