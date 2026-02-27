-- Allow the assigned VA (or admin) to insert task_charge when closing a task.
-- The trigger runs in the VA's session, so RLS was blocking the insert.
-- One task_charge per ticket via partial unique index.

create unique index if not exists credit_transactions_one_task_charge_per_ticket
  on public.credit_transactions (ticket_id)
  where type = 'task_charge' and ticket_id is not null;

drop policy if exists "credit_transactions_va_task_charge_insert" on public.credit_transactions;
create policy "credit_transactions_va_task_charge_insert" on public.credit_transactions
  for insert
  with check (
    type = 'task_charge'
    and amount <= 0
    and ticket_id is not null
    and (
      public.current_user_role() = 'admin'
      or (select t.assigned_va_id from public.tickets t where t.id = ticket_id) = auth.uid()
    )
  );
