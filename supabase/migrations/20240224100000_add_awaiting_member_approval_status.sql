-- Add status: awaiting_member_approval
-- Flow: new → assigned → awaiting_member_approval → in_progress → completed (and waiting_on_member, closed)

alter table public.tickets
  drop constraint if exists tickets_status_check;

alter table public.tickets
  add constraint tickets_status_check check (
    status in (
      'new',
      'assigned',
      'awaiting_member_approval',
      'in_progress',
      'waiting_on_member',
      'completed',
      'closed'
    )
  );
