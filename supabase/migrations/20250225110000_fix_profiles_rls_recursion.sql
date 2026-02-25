-- Fix infinite recursion: profiles policy must not use current_user_role() which reads profiles.
-- Use a separate admins table so the policy can check admin without touching profiles.

-- 1. Table of admin user ids (no reference to profiles in policy)
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

alter table public.admins enable row level security;

-- Any authenticated user can check "am I in this table?" (for policy evaluation)
drop policy if exists "admins_select_authenticated" on public.admins;
create policy "admins_select_authenticated" on public.admins
  for select to authenticated using (true);

-- 2. Backfill from existing profiles
insert into public.admins (user_id)
  select id from public.profiles where role = 'admin'
  on conflict (user_id) do nothing;

-- 3. Keep admins in sync when profile role changes
create or replace function public.sync_admins_from_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role = 'admin' then
    insert into public.admins (user_id) values (new.id) on conflict (user_id) do nothing;
  else
    delete from public.admins where user_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists sync_admins_trigger on public.profiles;
create trigger sync_admins_trigger
  after insert or update of role on public.profiles
  for each row
  execute function public.sync_admins_from_profile();

-- 4. Replace profiles_admin_all to use admins table instead of current_user_role()
drop policy if exists "profiles_admin_all" on public.profiles;
create policy "profiles_admin_all" on public.profiles
  for all using (exists (select 1 from public.admins where user_id = auth.uid()));
