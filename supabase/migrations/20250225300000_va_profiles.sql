-- VA Public Profiles: display in member task view for trust layer.
-- Only users with role = 'va' can have a va_profile. RLS: VA update own, Admin update any, Members read.

-- 1. va_profiles table
create table if not exists public.va_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  profile_image_url text,
  bio text,
  specialties text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint va_profiles_bio_max_length check (bio is null or char_length(bio) <= 240)
);

comment on column public.va_profiles.bio is 'Plain text only, max 240 characters. No HTML.';

-- Only VAs can have a va_profile: enforce on insert/update via trigger (user_roles.role = 'va')
create or replace function public.va_profiles_ensure_va_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.user_roles ur where ur.user_id = new.user_id and ur.role = 'va') then
    raise exception 'va_profiles can only exist for users with role va';
  end if;
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists va_profiles_ensure_va_trigger on public.va_profiles;
create trigger va_profiles_ensure_va_trigger
  before insert or update on public.va_profiles
  for each row execute function public.va_profiles_ensure_va_role();

-- updated_at trigger
drop trigger if exists va_profiles_updated_at on public.va_profiles;
create trigger va_profiles_updated_at
  before update on public.va_profiles
  for each row execute function public.set_updated_at();

alter table public.va_profiles enable row level security;

-- Members: read-only (select) on all va_profiles
drop policy if exists "va_profiles_select_members" on public.va_profiles;
create policy "va_profiles_select_members" on public.va_profiles
  for select using (true);

-- VA: update own profile only (insert/update where user_id = auth.uid())
drop policy if exists "va_profiles_va_own" on public.va_profiles;
create policy "va_profiles_va_own" on public.va_profiles
  for all using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Admin: full access (select, insert, update, delete)
drop policy if exists "va_profiles_admin_all" on public.va_profiles;
create policy "va_profiles_admin_all" on public.va_profiles
  for all using (exists (select 1 from public.admins where user_id = auth.uid()));

-- 2. Storage bucket for VA profile images: path = {user_id}.jpg
-- Create bucket in Dashboard: Storage → New bucket → id = 'va-profile-images', set Public.
-- Policies below assume bucket_id = 'va-profile-images'.

-- VA can upload/update only their own file: path = {user_id}.jpg
drop policy if exists "va_profile_images_upload_own" on storage.objects;
create policy "va_profile_images_upload_own"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'va-profile-images'
  and name = (auth.uid()::text || '.jpg')
);

drop policy if exists "va_profile_images_update_own" on storage.objects;
create policy "va_profile_images_update_own"
on storage.objects for update to authenticated
using (
  bucket_id = 'va-profile-images'
  and name = (auth.uid()::text || '.jpg')
);

-- Admin can upload/update any VA's file (path = {va_user_id}.jpg)
drop policy if exists "va_profile_images_upload_admin" on storage.objects;
create policy "va_profile_images_upload_admin"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'va-profile-images'
  and exists (select 1 from public.admins where user_id = auth.uid())
);

drop policy if exists "va_profile_images_update_admin" on storage.objects;
create policy "va_profile_images_update_admin"
on storage.objects for update to authenticated
using (
  bucket_id = 'va-profile-images'
  and exists (select 1 from public.admins where user_id = auth.uid())
);

-- Read: public bucket so member task view can show VA image without auth to storage
drop policy if exists "va_profile_images_select_public" on storage.objects;
create policy "va_profile_images_select_public"
on storage.objects for select to authenticated
using (bucket_id = 'va-profile-images');

-- Optional: allow anon read if bucket is public (for unauthenticated marketing pages). Omit if not needed.
-- Here we only allow authenticated read so member sees image when logged in.
