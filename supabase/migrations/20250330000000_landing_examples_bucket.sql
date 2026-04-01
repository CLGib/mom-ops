-- Storage bucket for landing "Explore real examples" assets (images + PDFs). Admin-only upload; public read.

insert into storage.buckets (id, name, public)
values ('landing-examples', 'landing-examples', true)
on conflict (id) do nothing;

-- Admins can upload/update/delete (for CEO managing examples)
create policy "landing_examples_insert_admin"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'landing-examples'
  and exists (select 1 from public.admins where user_id = auth.uid())
);

create policy "landing_examples_update_admin"
on storage.objects for update to authenticated
using (
  bucket_id = 'landing-examples'
  and exists (select 1 from public.admins where user_id = auth.uid())
)
with check (
  bucket_id = 'landing-examples'
  and exists (select 1 from public.admins where user_id = auth.uid())
);

create policy "landing_examples_delete_admin"
on storage.objects for delete to authenticated
using (
  bucket_id = 'landing-examples'
  and exists (select 1 from public.admins where user_id = auth.uid())
);

-- Public read so the marketing page can display images and PDFs
create policy "landing_examples_select_public"
on storage.objects for select to public
using (bucket_id = 'landing-examples');
