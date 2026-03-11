-- VA work review (training mode) and internal notes.
-- 1. va_profiles.work_requires_review: when true, VA messages are hidden from member until admin approves.
-- 2. ticket_messages.visible_to_member + .internal: member only sees non-internal, visible messages.
-- 3. Trigger sets visible_to_member on insert; 4. RLS updated for member select.

-- 1. va_profiles: training mode flag (default true for new VAs; existing VAs get full access)
alter table public.va_profiles
  add column if not exists work_requires_review boolean not null default true;

comment on column public.va_profiles.work_requires_review is 'When true, VA is in training: messages hidden from member until admin approves. Set false for full-access VA.';

-- Existing VAs: give them full access so we don't change current behavior (only rows where user has role 'va')
update public.va_profiles v
set work_requires_review = false
from public.user_roles ur
where ur.user_id = v.user_id and ur.role = 'va' and v.work_requires_review = true;

-- 2. ticket_messages: visibility and internal note (separate alters for compatibility with schema cache)
alter table public.ticket_messages
  add column if not exists visible_to_member boolean not null default true;

alter table public.ticket_messages
  add column if not exists internal boolean not null default false;

comment on column public.ticket_messages.visible_to_member is 'When false, member cannot see this message (pending review or internal).';
comment on column public.ticket_messages.internal is 'When true, internal note: only staff see it, never the member.';

-- Backfill existing messages as visible (no-op if columns already had defaults)
update public.ticket_messages set visible_to_member = true where visible_to_member is null;
update public.ticket_messages set internal = false where internal is null;

-- 3. Trigger: set visible_to_member on insert
create or replace function public.ticket_messages_set_visible_to_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_work_requires_review boolean;
begin
  if new.internal = true then
    new.visible_to_member := false;
    return new;
  end if;
  if new.sender_role = 'va' then
    select work_requires_review into v_work_requires_review
    from public.va_profiles
    where user_id = new.sender_id
    limit 1;
    if found and v_work_requires_review = true then
      new.visible_to_member := false;
    else
      new.visible_to_member := true;
    end if;
  else
    new.visible_to_member := true;
  end if;
  return new;
end;
$$;

drop trigger if exists ticket_messages_set_visible_to_member_trigger on public.ticket_messages;
create trigger ticket_messages_set_visible_to_member_trigger
  before insert on public.ticket_messages
  for each row execute function public.ticket_messages_set_visible_to_member();

-- 4. RLS: member may only see non-internal messages that are visible (or their own)
drop policy if exists "ticket_messages_select_ticket_member" on public.ticket_messages;
create policy "ticket_messages_select_ticket_member" on public.ticket_messages
  for select using (
    exists (select 1 from public.tickets t where t.id = ticket_id and t.member_id = auth.uid())
    and internal = false
    and (visible_to_member = true or sender_id = auth.uid())
  );
