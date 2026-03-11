-- Allow document (PDF, etc.) and all file types in ticket_attachments
alter table public.ticket_attachments
  drop constraint if exists ticket_attachments_media_type_check;

alter table public.ticket_attachments
  add constraint ticket_attachments_media_type_check
  check (media_type in ('image', 'video', 'audio', 'document'));
