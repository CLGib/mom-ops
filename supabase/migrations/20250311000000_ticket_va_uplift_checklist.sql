-- UPLIFT checklist for VAs: U=Update profile, P=Plan path, L=Level up, I=Inform VIP, F=Forward loop, T=Track & Teach

create table if not exists public.ticket_va_uplift_checklist (
  ticket_id uuid primary key references public.tickets(id) on delete cascade,
  u boolean not null default false,
  p boolean not null default false,
  l boolean not null default false,
  i boolean not null default false,
  f boolean not null default false,
  t boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- updated_at trigger
create trigger ticket_va_uplift_checklist_updated_at
  before update on public.ticket_va_uplift_checklist
  for each row execute function public.set_updated_at();

-- RLS
alter table public.ticket_va_uplift_checklist enable row level security;

-- VA can select/insert/update only for tickets assigned to them
create policy "ticket_va_uplift_checklist_select_assigned"
  on public.ticket_va_uplift_checklist for select
  using (
    exists (
      select 1 from public.tickets t
      where t.id = ticket_id and t.assigned_va_id = auth.uid()
    )
  );

create policy "ticket_va_uplift_checklist_insert_assigned"
  on public.ticket_va_uplift_checklist for insert
  with check (
    exists (
      select 1 from public.tickets t
      where t.id = ticket_id and t.assigned_va_id = auth.uid()
    )
  );

create policy "ticket_va_uplift_checklist_update_assigned"
  on public.ticket_va_uplift_checklist for update
  using (
    exists (
      select 1 from public.tickets t
      where t.id = ticket_id and t.assigned_va_id = auth.uid()
    )
  );

-- Admin can do all (for support/debugging)
create policy "ticket_va_uplift_checklist_admin_all"
  on public.ticket_va_uplift_checklist for all
  using (public.current_user_role() = 'admin');
