-- Create task-attachments bucket if missing, ensure it's public.
-- Public bucket + public select policy allows VAs (and members) to load attachment
-- URLs in img/video/audio tags without auth (browser fetches are unauthenticated).
insert into storage.buckets (id, name, public)
values ('task-attachments', 'task-attachments', true)
on conflict (id) do update set public = true;

-- Add public select so attachment URLs work when loaded in browser (img src, etc).
-- The existing task_attachments_read policy only allows authenticated; browser
-- requests to storage may not include auth, so public read is needed.
drop policy if exists "task_attachments_select_public" on storage.objects;
create policy "task_attachments_select_public"
on storage.objects for select to public
using (bucket_id = 'task-attachments');
