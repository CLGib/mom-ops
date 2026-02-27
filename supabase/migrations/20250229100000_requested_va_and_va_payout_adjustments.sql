-- requested_va_id: member can request a VA they've worked with before
alter table public.tickets
  add column if not exists requested_va_id uuid references public.profiles(id);

-- VA payout adjustments: admin can debit or bonus a VA's payout
create table if not exists public.va_payout_adjustments (
  id uuid primary key default gen_random_uuid(),
  va_id uuid not null references public.profiles(id) on delete cascade,
  amount_cents integer not null,
  type text not null check (type in ('debit', 'bonus')),
  note text,
  created_at timestamptz default now(),
  created_by uuid references public.profiles(id)
);

alter table public.va_payout_adjustments enable row level security;

drop policy if exists "va_payout_adjustments_admin_all" on public.va_payout_adjustments;
create policy "va_payout_adjustments_admin_all"
  on public.va_payout_adjustments
  for all
  using (public.current_user_role() = 'admin');

drop policy if exists "va_payout_adjustments_va_select_own" on public.va_payout_adjustments;
create policy "va_payout_adjustments_va_select_own"
  on public.va_payout_adjustments
  for select
  using (va_id = auth.uid());
