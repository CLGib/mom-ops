-- VA task earnings: record payout when a task is completed/closed ($0.20 per credit + tips).
-- One row per ticket; populated by the same trigger that charges the member.

create table if not exists public.va_task_earnings (
  id uuid primary key default gen_random_uuid(),
  va_id uuid not null references public.profiles(id) on delete cascade,
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  amount_cents integer not null,
  created_at timestamptz default now()
);

create unique index if not exists va_task_earnings_one_per_ticket
  on public.va_task_earnings (ticket_id);

alter table public.va_task_earnings enable row level security;

drop policy if exists "va_task_earnings_va_select_own" on public.va_task_earnings;
create policy "va_task_earnings_va_select_own" on public.va_task_earnings
  for select using (va_id = auth.uid());

drop policy if exists "va_task_earnings_admin_all" on public.va_task_earnings;
create policy "va_task_earnings_admin_all" on public.va_task_earnings
  for all using (public.current_user_role() = 'admin');

-- Allow assigned VA to insert their own earnings row (trigger runs in VA session)
drop policy if exists "va_task_earnings_va_insert_own" on public.va_task_earnings;
create policy "va_task_earnings_va_insert_own" on public.va_task_earnings
  for insert
  with check (
    va_id = auth.uid()
    and (select t.assigned_va_id from public.tickets t where t.id = ticket_id) = auth.uid()
  );

comment on table public.va_task_earnings is 'Earnings accrued by VA when a task is completed/closed: $0.20 per credit + tips (amount_cents).';
