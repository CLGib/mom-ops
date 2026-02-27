-- Create the va-profile-images bucket so admin/VA profile image uploads work.
-- Skip if it already exists (e.g. created manually in Dashboard).
insert into storage.buckets (id, name, public)
values ('va-profile-images', 'va-profile-images', true)
on conflict (id) do nothing;
