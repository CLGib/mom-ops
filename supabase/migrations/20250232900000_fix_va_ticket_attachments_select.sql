-- Fix VA ticket_attachments select: RLS subquery against tickets may not see the row
-- in some contexts. Use a SECURITY DEFINER function so the check bypasses RLS on tickets.

create or replace function public.ticket_attachments_va_can_select(p_ticket_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    return false;
  end if;
  return exists (
    select 1 from public.tickets t
    where t.id = p_ticket_id
    and t.assigned_va_id = v_user_id
  );
end;
$$;

drop policy if exists "ticket_attachments_select_va" on public.ticket_attachments;
create policy "ticket_attachments_select_va" on public.ticket_attachments
  for select using (public.ticket_attachments_va_can_select(ticket_id));
