-- Add optional feedback/review text to tickets (member submits with 1-5 rating)
alter table public.tickets
  add column if not exists feedback text;

comment on column public.tickets.feedback is 'Optional written review from member when rating a completed/closed task.';
