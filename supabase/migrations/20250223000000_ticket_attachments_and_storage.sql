-- Ticket attachments table (stores references to files in Storage)
create table if not exists public.ticket_attachments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  file_path text not null,
  file_name text,
  media_type text not null check (media_type in ('image', 'video')),
  created_at timestamptz default now()
);

alter table public.ticket_attachments enable row level security;

-- Members see attachments for their tickets; admins see all (VA policies can be added similarly)
drop policy if exists "ticket_attachments_select_member" on public.ticket_attachments;
drop policy if exists "ticket_attachments_select_va" on public.ticket_attachments;
drop policy if exists "ticket_attachments_select_admin" on public.ticket_attachments;
drop policy if exists "ticket_attachments_insert_member" on public.ticket_attachments;
create policy "ticket_attachments_select_member" on public.ticket_attachments
  for select using (
    exists (select 1 from public.tickets t where t.id = ticket_id and t.member_id = auth.uid())
  );
create policy "ticket_attachments_select_va" on public.ticket_attachments
  for select using (
    exists (select 1 from public.tickets t where t.id = ticket_id and t.assigned_va_id = auth.uid())
  );
create policy "ticket_attachments_select_admin" on public.ticket_attachments
  for select using (public.current_user_role() = 'admin');

create policy "ticket_attachments_insert_member" on public.ticket_attachments
  for insert with check (
    exists (select 1 from public.tickets t where t.id = ticket_id and t.member_id = auth.uid())
  );

-- Storage: create bucket "task-attachments" (public) in Dashboard → Storage → New bucket,
-- or via API: supabase.storage.createBucket('task-attachments', { public: true })

-- Allow members to upload only to paths where the first segment is their ticket id
drop policy if exists "task_attachments_upload" on storage.objects;
create policy "task_attachments_upload"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'task-attachments'
  and exists (
    select 1 from public.tickets t
    where t.id::text = (storage.foldername(name))[1]
    and t.member_id = auth.uid()
  )
);

-- Allow read for own tickets (member), assigned tickets (VA), and admin
drop policy if exists "task_attachments_read" on storage.objects;
create policy "task_attachments_read"
on storage.objects for select to authenticated
using (
  bucket_id = 'task-attachments'
  and (
    exists (
      select 1 from public.tickets t
      where t.id::text = (storage.foldername(name))[1]
      and (t.member_id = auth.uid() or t.assigned_va_id = auth.uid())
    )
    or public.current_user_role() = 'admin'
  )
);
