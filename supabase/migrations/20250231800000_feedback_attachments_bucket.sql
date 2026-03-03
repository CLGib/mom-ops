-- Storage bucket for feature/bug submission screenshots (any authenticated user can upload).

insert into storage.buckets (id, name, public)
values ('feedback-attachments', 'feedback-attachments', true)
on conflict (id) do nothing;

-- Authenticated users can upload only under their own folder: {user_id}/...
create policy "feedback_attachments_upload_own"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'feedback-attachments'
  and split_part(name, '/', 1) = auth.uid()::text
);

create policy "feedback_attachments_update_own"
on storage.objects for update to authenticated
using (
  bucket_id = 'feedback-attachments'
  and split_part(name, '/', 1) = auth.uid()::text
);

-- Public read so board can show screenshots
create policy "feedback_attachments_select"
on storage.objects for select to public
using (bucket_id = 'feedback-attachments');
