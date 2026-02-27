-- Requested specialist: audit fields and optional note
alter table public.tickets
  add column if not exists requested_va_set_at timestamptz,
  add column if not exists requested_va_note text;

comment on column public.tickets.requested_va_note is 'Optional note from member, e.g. "Prefer Sarah if possible"';
