-- Fix security definer view linter: va_member_profile_view
-- See https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view
--
-- Recreate the view with security_invoker so it runs as the caller and respects RLS.
-- get_va_member_context() remains SECURITY DEFINER and still enforces ticket assignment;
-- when it queries this view, the view runs as the calling VA, so we need a profiles
-- policy allowing VAs to SELECT only member profiles they have an assigned ticket for.

-- 1. Recreate view with security_invoker (drop/recreate; attribute cannot be altered in place)
drop view if exists public.va_member_profile_view;
create view public.va_member_profile_view
  with (security_invoker = on)
as
select
  p.id as member_id,
  p.preferred_name,
  p.full_name,
  p.timezone,
  p.city,
  p.state,
  p.kids_count,
  p.kids_ages,
  p.household_members,
  p.schools,
  p.activities,
  p.preferred_stores,
  p.preferred_brands,
  p.communication_tone,
  p.constraints,
  p.important_dates,
  p.task_submission_preference,
  p.typical_turnaround
from public.profiles p
where p.role = 'member';

-- 2. Allow VAs to SELECT member profiles only for members they have an assigned ticket with
create policy "profiles_va_select_assigned_member"
  on public.profiles
  for select
  using (
    role = 'member'
    and exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid() and ur.role = 'va'
    )
    and exists (
      select 1 from public.tickets t
      where t.member_id = profiles.id and t.assigned_va_id = auth.uid()
    )
  );
