-- Recurring tasks: members can define tasks that auto-create tickets on a schedule (e.g. weekly meal plan every Saturday).

-- 1. member_recurring_tasks
create table if not exists public.member_recurring_tasks (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles(id) on delete cascade,
  task_library_id uuid references public.task_library(id) on delete set null,
  subject text,
  description_template text,
  schedule_type text not null check (schedule_type in ('weekly')),
  schedule_config jsonb not null default '{}',
  context_notes text,
  credit_cost integer,
  is_active boolean not null default true,
  last_created_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recurring_task_has_subject_or_library check (
    (task_library_id is not null) or (subject is not null and subject <> '')
  )
);

comment on table public.member_recurring_tasks is 'Member-defined recurring tasks; a cron job creates tickets from these on schedule.';
comment on column public.member_recurring_tasks.schedule_config is 'For weekly: {"day_of_week": 0-6} (0=Sunday, 6=Saturday).';
comment on column public.member_recurring_tasks.last_created_at is 'Last time a ticket was created for this recurrence (idempotency).';

create index if not exists member_recurring_tasks_member_id_idx on public.member_recurring_tasks (member_id);
create index if not exists member_recurring_tasks_active_schedule_idx on public.member_recurring_tasks (is_active, schedule_type) where is_active = true;

-- updated_at trigger
create or replace function public.set_member_recurring_tasks_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists member_recurring_tasks_updated_at on public.member_recurring_tasks;
create trigger member_recurring_tasks_updated_at
  before update on public.member_recurring_tasks
  for each row execute function public.set_member_recurring_tasks_updated_at();

-- RLS: members manage their own rows
alter table public.member_recurring_tasks enable row level security;

drop policy if exists "member_recurring_tasks_select_own" on public.member_recurring_tasks;
create policy "member_recurring_tasks_select_own" on public.member_recurring_tasks
  for select using (member_id = auth.uid());

drop policy if exists "member_recurring_tasks_insert_own" on public.member_recurring_tasks;
create policy "member_recurring_tasks_insert_own" on public.member_recurring_tasks
  for insert with check (member_id = auth.uid());

drop policy if exists "member_recurring_tasks_update_own" on public.member_recurring_tasks;
create policy "member_recurring_tasks_update_own" on public.member_recurring_tasks
  for update using (member_id = auth.uid());

drop policy if exists "member_recurring_tasks_delete_own" on public.member_recurring_tasks;
create policy "member_recurring_tasks_delete_own" on public.member_recurring_tasks
  for delete using (member_id = auth.uid());

-- 2. tickets: optional link to recurring task for traceability
alter table public.tickets
  add column if not exists recurring_task_id uuid references public.member_recurring_tasks(id) on delete set null;

comment on column public.tickets.recurring_task_id is 'Set when ticket was auto-created from a member recurring task.';
