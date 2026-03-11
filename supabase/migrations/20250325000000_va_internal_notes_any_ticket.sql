-- Allow VAs to add internal notes on any ticket (read-only tasks). They can leave notes for other VAs
-- but cannot reply to the customer on tickets not assigned to them.

create policy "ticket_messages_insert_va_internal_any" on public.ticket_messages
  for insert with check (
    public.current_user_role() = 'va'
    and internal = true
    and exists (select 1 from public.tickets t where t.id = ticket_id)
  );
