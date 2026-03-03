-- VA (and admin) task cancellation: new statuses and cancellation fields.
-- Only assigned VA can cancel; admins can cancel/override any task.
-- Charge/earnings triggers only run on completed/closed, so cancelled tasks do not charge or accrue VA pay.

-- 1. Extend tickets status to include cancelled_by_va, cancelled_by_admin
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
      'cancelled_by_va',
      'cancelled_by_admin'
    )
  );

-- 2. Cancellation metadata (set when status is cancelled_by_va or cancelled_by_admin)
alter table public.tickets
  add column if not exists cancelled_by text check (cancelled_by is null or cancelled_by in ('va', 'admin'));

alter table public.tickets
  add column if not exists cancellation_reason text;

alter table public.tickets
  add column if not exists cancellation_notes text;

alter table public.tickets
  add column if not exists cancelled_at timestamptz;

comment on column public.tickets.cancelled_by is 'Set when status is cancelled_by_va or cancelled_by_admin.';
comment on column public.tickets.cancellation_reason is 'Required reason code when VA/admin cancels (e.g. customer_request, scope_outside_skillset).';
comment on column public.tickets.cancellation_notes is 'Optional additional notes from VA/admin.';
comment on column public.tickets.cancelled_at is 'When the task was cancelled.';
