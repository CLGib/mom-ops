-- Admin no longer needs to approve VA work before members can view it.
-- Keep internal notes hidden from members, but make all non-internal messages visible.

-- Existing VA messages that were pending review should now be visible.
update public.ticket_messages
set visible_to_member = true
where sender_role = 'va'
  and internal = false
  and visible_to_member = false;

-- Disable training-mode review requirement for all specialists.
update public.va_profiles
set work_requires_review = false
where work_requires_review = true;

-- Ensure new messages are visible unless marked internal.
create or replace function public.ticket_messages_set_visible_to_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.visible_to_member := (new.internal is distinct from true);
  return new;
end;
$$;
