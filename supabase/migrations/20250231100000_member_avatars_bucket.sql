-- Member avatar images for public reviews feed. Path: {member_id}/avatar.{ext}
insert into storage.buckets (id, name, public)
values ('member-avatars', 'member-avatars', true)
on conflict (id) do nothing;

-- Members can upload/update only their own file under their user id folder.
drop policy if exists "member_avatars_upload_own" on storage.objects;
create policy "member_avatars_upload_own"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'member-avatars'
  and split_part(name, '/', 1) = auth.uid()::text
);

drop policy if exists "member_avatars_update_own" on storage.objects;
create policy "member_avatars_update_own"
on storage.objects for update to authenticated
using (
  bucket_id = 'member-avatars'
  and split_part(name, '/', 1) = auth.uid()::text
);

-- Public read so feed can show avatars.
drop policy if exists "member_avatars_select" on storage.objects;
create policy "member_avatars_select"
on storage.objects for select to public
using (bucket_id = 'member-avatars');
