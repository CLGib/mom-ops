-- Household members: kids, spouse, other important people (for birthday reminders, personalization)
-- Each: type (kid|spouse|other), name, likes, dislikes, birthday, clothing_size, relation (for other)

alter table public.profiles
  add column if not exists household_members jsonb;

comment on column public.profiles.household_members is 'Kids, spouse, other important people. Array of {type, name?, likes?, dislikes?, birthday?, clothing_size?, relation?}. Birthdays used for reminders.';

-- Update va_member_profile_view to include household_members
drop view if exists public.va_member_profile_view;
create view public.va_member_profile_view as
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

-- Update get_va_member_context RPC (drop first: return type changed, so replace is not allowed)
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
  typical_turnaround text
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
    v.typical_turnaround
  from public.va_member_profile_view v
  where v.member_id = v_mid;
end;
$$;
