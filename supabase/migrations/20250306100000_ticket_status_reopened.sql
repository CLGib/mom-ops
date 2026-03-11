-- Reopened: member replied after ticket was closed/completed; ticket goes back to VA inbox (no double charge).

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
      'closed',
      'reopened',
      'cancelled_by_va',
      'cancelled_by_admin'
    )
  );
