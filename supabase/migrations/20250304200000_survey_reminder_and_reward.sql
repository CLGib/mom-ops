-- 1) Queue survey_reminder_v1 email 24h after task complete/closed (same trigger as task_complete_v1).
-- 2) Allow 'survey_reward' in credit_transactions for 2-credit reward on survey completion.

create or replace function public.queue_task_complete_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  send_at timestamptz;
begin
  if (new.status = 'completed' or new.status = 'closed')
     and (old.status is null or (old.status <> 'completed' and old.status <> 'closed'))
  then
    insert into public.email_outbox (to_email, template, payload, dedupe_key)
    values (
      null,
      'task_complete_v1',
      jsonb_build_object('member_id', new.member_id, 'ticket_id', new.id),
      'task_complete:' || new.id::text
    )
    on conflict (dedupe_key) do nothing;

    send_at := COALESCE(new.completed_at, now()) + interval '24 hours';
    insert into public.email_outbox (to_email, template, payload, dedupe_key, send_after)
    values (
      null,
      'survey_reminder_v1',
      jsonb_build_object('member_id', new.member_id, 'ticket_id', new.id),
      'survey_reminder:' || new.id::text,
      send_at
    )
    on conflict (dedupe_key) do nothing;
  end if;
  return new;
end;
$$;

alter table public.credit_transactions
  drop constraint if exists credit_transactions_type_check;

alter table public.credit_transactions
  add constraint credit_transactions_type_check
  check (type in ('purchase', 'admin_adjustment', 'task_charge', 'referral', 'survey_reward'));
