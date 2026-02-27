-- Ensure VAs can SELECT ticket_messages for tickets they're assigned to (so they see thread replies).
-- If 00000001 ran without 20240224000001, the VA policy was never created; this fixes that.
drop policy if exists "ticket_messages_select_ticket_va" on public.ticket_messages;
create policy "ticket_messages_select_ticket_va" on public.ticket_messages
  for select using (
    exists (select 1 from public.tickets t where t.id = ticket_id and t.assigned_va_id = auth.uid())
  );
