-- Member and VA can delete ticket attachments (e.g. wrong file uploaded)

-- ticket_attachments: delete when user is the ticket's member or assigned VA
create policy "ticket_attachments_delete_member_or_va" on public.ticket_attachments
  for delete using (
    exists (
      select 1 from public.tickets t
      where t.id = ticket_attachments.ticket_id
      and (t.member_id = auth.uid() or t.assigned_va_id = auth.uid())
    )
  );

-- storage: allow delete for task-attachments in ticket folders the user owns or is assigned to
-- (reuses same path check as upload: first segment = ticket_id)
create policy "task_attachments_delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'task-attachments'
  and public.storage_task_attachments_upload_allowed(name, bucket_id)
);
