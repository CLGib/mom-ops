-- Avoid recursion: current_user_role() must not read from profiles when user is admin.
-- Check public.admins first; only read profiles for non-admins (then RLS allows own row only).

create or replace function public.current_user_role()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (select 'admin'::text from public.admins where user_id = auth.uid() limit 1),
    (select role::text from public.profiles where id = auth.uid() limit 1)
  );
$$;
