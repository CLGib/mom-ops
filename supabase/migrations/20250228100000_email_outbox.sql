-- Email outbox queue for transactional outbound (Resend worker drains it)
create table if not exists public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  to_email text,
  template text not null,
  payload jsonb not null default '{}',
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed')),
  attempts int not null default 0,
  last_error text,
  dedupe_key text not null unique,
  send_after timestamptz,
  created_at timestamptz default now()
);

create index if not exists idx_email_outbox_queued
  on public.email_outbox (created_at)
  where status = 'queued';

alter table public.email_outbox enable row level security;

-- No policies: only service role (worker/API) should access; RLS blocks anon/authenticated from reading/writing
-- Worker and queue API use SUPABASE_SERVICE_ROLE_KEY which bypasses RLS

-- Task complete: queue email when ticket status becomes 'completed' (SECURITY DEFINER so trigger can insert)
create or replace function public.queue_task_complete_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'completed' and (old.status is null or old.status <> 'completed') then
    insert into public.email_outbox (to_email, template, payload, dedupe_key)
    values (
      null,
      'task_complete_v1',
      jsonb_build_object('member_id', new.member_id, 'ticket_id', new.id),
      'task_complete:' || new.id::text
    )
    on conflict (dedupe_key) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists queue_task_complete_email_trigger on public.tickets;
create trigger queue_task_complete_email_trigger
  after update of status on public.tickets
  for each row
  execute function public.queue_task_complete_email();
