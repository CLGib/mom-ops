-- Attachments can be linked to a specific message (VA/member reply) or to the ticket only (original task)
alter table public.ticket_attachments
  add column if not exists message_id uuid references public.ticket_messages(id) on delete cascade;

-- VA can insert attachments (for their replies)
drop policy if exists "ticket_attachments_insert_va" on public.ticket_attachments;
create policy "ticket_attachments_insert_va" on public.ticket_attachments
  for insert with check (
    exists (select 1 from public.tickets t where t.id = ticket_id and t.assigned_va_id = auth.uid())
  );

-- Storage: allow VA to upload to their assigned ticket's folder (first path segment = ticket_id)
drop policy if exists "task_attachments_upload" on storage.objects;
create policy "task_attachments_upload"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'task-attachments'
  and exists (
    select 1 from public.tickets t
    where t.id::text = (storage.foldername(name))[1]
    and (t.member_id = auth.uid() or t.assigned_va_id = auth.uid())
  )
);
