-- When a message is added to a ticket, bump the ticket's updated_at so inbox ordering reflects last activity.
create or replace function public.bump_ticket_updated_at_on_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.tickets
  set updated_at = now()
  where id = new.ticket_id;
  return new;
end;
$$;

drop trigger if exists ticket_messages_bump_ticket_updated_at on public.ticket_messages;
create trigger ticket_messages_bump_ticket_updated_at
  after insert on public.ticket_messages
  for each row execute function public.bump_ticket_updated_at_on_message();
