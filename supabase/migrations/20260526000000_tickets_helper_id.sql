-- Add helper_id column to tickets so the team can see at a glance which
-- library helper a one-click request came from, and we can do analytics later
-- ("which helpers get clicked most?").
--
-- No foreign key: the task_library mixes DB-backed UUIDs with JSON-only
-- "json-N" ids, so a hard FK would break the JSON entries. The team can
-- resolve the id back to a helper via getTaskByFromTaskParam().

alter table public.tickets
  add column if not exists helper_id text;

create index if not exists idx_tickets_helper_id
  on public.tickets(helper_id)
  where helper_id is not null;
