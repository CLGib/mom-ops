-- Fix recursion: profiles_select_admin read from profiles inside a policy on profiles.
-- Admin access is already granted by profiles_admin_all (via admins table).
drop policy if exists "profiles_select_admin" on public.profiles;
