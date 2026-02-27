-- Queue task_complete_v1 email when ticket becomes 'completed' OR 'closed' (member gets one email; dedupe prevents double send)
create or replace function public.queue_task_complete_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
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
  end if;
  return new;
end;
$$;
