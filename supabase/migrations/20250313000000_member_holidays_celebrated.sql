-- Add holidays_celebrated to member profiles (checkboxes for holidays from all religions).

-- 1. Add column to profiles (array of holiday keys, stored as jsonb)
alter table public.profiles
  add column if not exists holidays_celebrated jsonb default '[]';

comment on column public.profiles.holidays_celebrated is 'Holiday keys the member celebrates (e.g. christmas, hanukkah, eid_al_fitr).';

-- 2. Recreate va_member_profile_view to include holidays_celebrated
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
  p.typical_turnaround,
  p.custom_field_values,
  p.holidays_celebrated
from public.profiles p
where p.role = 'member';

-- 3. Update get_va_member_context to return holidays_celebrated
drop function if exists public.get_va_member_context(uuid);
create function public.get_va_member_context(p_ticket_id uuid)
returns table (
  member_id uuid,
  preferred_name text,
  full_name text,
  timezone text,
  city text,
  state text,
  kids_count integer,
  kids_ages jsonb,
  household_members jsonb,
  schools jsonb,
  activities jsonb,
  preferred_stores jsonb,
  preferred_brands jsonb,
  communication_tone text,
  constraints text,
  important_dates jsonb,
  task_submission_preference text,
  typical_turnaround text,
  custom_field_values jsonb,
  holidays_celebrated jsonb
)
language plpgsql security definer
set search_path = public
as $$
declare
  v_mid uuid;
begin
  select t.member_id into v_mid
  from public.tickets t
  where t.id = p_ticket_id
    and t.assigned_va_id = auth.uid();

  if v_mid is null then
    return;
  end if;

  return query
  select
    v.member_id,
    v.preferred_name,
    v.full_name,
    v.timezone,
    v.city,
    v.state,
    v.kids_count,
    v.kids_ages,
    v.household_members,
    v.schools,
    v.activities,
    v.preferred_stores,
    v.preferred_brands,
    v.communication_tone,
    v.constraints,
    v.important_dates,
    v.task_submission_preference,
    v.typical_turnaround,
    v.custom_field_values,
    v.holidays_celebrated
  from public.va_member_profile_view v
  where v.member_id = v_mid;
end;
$$;
