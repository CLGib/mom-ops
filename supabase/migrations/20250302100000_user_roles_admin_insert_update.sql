-- Allow admins to INSERT and UPDATE user_roles so the set-role API can keep
-- user_roles in sync when changing a team member's role (RLS was blocking the upsert).

-- Admin can insert a row (e.g. when assigning role to a user who had none)
create policy "user_roles_admin_insert" on public.user_roles
  for insert
  with check (exists (select 1 from public.admins where user_id = auth.uid()));

-- Admin can update any user's role
create policy "user_roles_admin_update" on public.user_roles
  for update
  using (exists (select 1 from public.admins where user_id = auth.uid()));
