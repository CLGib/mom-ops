-- When an internal note is posted with @mentions (data-mention-user-id in message HTML),
-- record them so mentioned VAs see the ticket in their inbox until it is closed.

create table if not exists public.ticket_mentions (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  message_id uuid not null references public.ticket_messages(id) on delete cascade,
  mentioned_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (message_id, mentioned_user_id)
);

create index if not exists ticket_mentions_mentioned_user_id_idx
  on public.ticket_mentions(mentioned_user_id);

create index if not exists ticket_mentions_ticket_id_idx
  on public.ticket_mentions(ticket_id);

comment on table public.ticket_mentions is 'VA @mentions in internal notes; mentioned VAs see ticket in inbox until closed.';

-- Extract UUIDs from data-mention-user-id="..." in message HTML and insert one row per mentioned user.
create or replace function public.ticket_messages_extract_mentions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  match_row text[];
  u uuid;
  seen uuid[] := '{}';
begin
  if new.internal is not true then
    return new;
  end if;
  for match_row in
    select regexp_matches(new.message, 'data-mention-user-id="([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})"', 'gi')
  loop
    begin
      u := match_row[1]::uuid;
    exception when others then
      continue;
    end;
    if u is not null and not (u = any(seen)) then
      seen := array_append(seen, u);
      insert into public.ticket_mentions (ticket_id, message_id, mentioned_user_id)
      values (new.ticket_id, new.id, u)
      on conflict (message_id, mentioned_user_id) do nothing;
    end if;
  end loop;
  return new;
end;
$$;

drop trigger if exists ticket_messages_extract_mentions_trigger on public.ticket_messages;
create trigger ticket_messages_extract_mentions_trigger
  after insert on public.ticket_messages
  for each row execute function public.ticket_messages_extract_mentions();

alter table public.ticket_mentions enable row level security;

-- VA can see rows where they are the mentioned user.
create policy "ticket_mentions_select_own"
  on public.ticket_mentions
  for select
  using (mentioned_user_id = auth.uid());
