-- Allow deleting a VA (or any user) when they have sent ticket_messages.
-- When the profile is deleted, set sender_id to null so the message remains (sender_role still indicates who sent it).

alter table public.ticket_messages
  alter column sender_id drop not null;

-- Drop the FK on sender_id (name may vary: ticket_messages_sender_id_fkey or similar)
do $$
declare
  con name;
begin
  select c.conname into con
  from pg_constraint c
  join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any(c.conkey) and not a.attisdropped
  where c.conrelid = 'public.ticket_messages'::regclass
    and c.contype = 'f'
    and a.attname = 'sender_id';
  if con is not null then
    execute format('alter table public.ticket_messages drop constraint %I', con);
  end if;
end $$;

alter table public.ticket_messages
  add constraint ticket_messages_sender_id_fkey
  foreign key (sender_id) references public.profiles(id) on delete set null;
