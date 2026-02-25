-- Eliminate recursion: current_user_role() must NEVER read from profiles.
-- Use a dedicated user_roles table so no policy evaluation on profiles can re-enter profiles.

-- 1. Table that holds (user_id, role) in sync with profiles
create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('member', 'va', 'admin'))
);

alter table public.user_roles enable row level security;

drop policy if exists "user_roles_select_own" on public.user_roles;
create policy "user_roles_select_own" on public.user_roles
  for select using (user_id = auth.uid());

drop policy if exists "user_roles_admin_all" on public.user_roles;
create policy "user_roles_admin_all" on public.user_roles
  for select using (exists (select 1 from public.admins where user_id = auth.uid()));

-- 2. Backfill from profiles (run as migration owner, no RLS)
insert into public.user_roles (user_id, role)
  select id, role from public.profiles
  on conflict (user_id) do update set role = excluded.role;

-- 3. Keep user_roles in sync when profile role changes
create or replace function public.sync_user_roles_from_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_roles (user_id, role) values (new.id, new.role)
  on conflict (user_id) do update set role = excluded.role;
  return new;
end;
$$;

drop trigger if exists sync_user_roles_trigger on public.profiles;
create trigger sync_user_roles_trigger
  after insert or update of role on public.profiles
  for each row
  execute function public.sync_user_roles_from_profile();

-- 4. current_user_role() reads ONLY from user_roles (never profiles)
create or replace function public.current_user_role()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select role::text from public.user_roles where user_id = auth.uid() limit 1;
$$;
