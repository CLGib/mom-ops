-- Add human-readable ticket numbers so VAs and admins can share context (e.g. "Ticket #1234")
create sequence if not exists public.ticket_number_seq;

alter table public.tickets add column if not exists ticket_number integer;

-- Backfill only rows that don't have a number yet (safe for re-run)
with ordered as (
  select id, row_number() over (order by created_at, id) as rn
  from public.tickets
  where ticket_number is null
)
update public.tickets t
set ticket_number = o.rn
from ordered o
where o.id = t.id and t.ticket_number is null;

alter table public.tickets alter column ticket_number set not null;
alter table public.tickets drop constraint if exists tickets_ticket_number_key;
alter table public.tickets add constraint tickets_ticket_number_key unique (ticket_number);
alter table public.tickets alter column ticket_number set default nextval('public.ticket_number_seq');

-- Ensure new tickets get the next number after the max
select setval('public.ticket_number_seq', (select coalesce(max(ticket_number), 0) + 1 from public.tickets));
