-- Admin-defined custom fields for member profiles.
-- Definitions: label, key (slug), type, order. Values stored on profiles.custom_field_values (jsonb).

-- 1. Definitions table (admin-only CRUD)
create table if not exists public.member_profile_custom_field_definitions (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label text not null,
  field_type text not null check (field_type in ('text', 'number', 'date', 'multiline')),
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

comment on table public.member_profile_custom_field_definitions is 'Admin-defined extra fields for member profiles. Keys are slugs used in custom_field_values.';
comment on column public.member_profile_custom_field_definitions.key is 'Slug for the field (e.g. allergy_notes). Used as key in profiles.custom_field_values.';
comment on column public.member_profile_custom_field_definitions.field_type is 'One of: text, number, date, multiline.';

alter table public.member_profile_custom_field_definitions enable row level security;

-- Admin can do everything; authenticated users can read active definitions (for profile form and VA context)
create policy "member_profile_custom_field_definitions_admin_all"
  on public.member_profile_custom_field_definitions
  for all
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

create policy "member_profile_custom_field_definitions_select_active"
  on public.member_profile_custom_field_definitions
  for select
  using (auth.role() = 'authenticated' and active = true);

-- 2. Custom field values on profiles (key -> value per definition)
alter table public.profiles
  add column if not exists custom_field_values jsonb default '{}';

comment on column public.profiles.custom_field_values is 'Values for admin-defined custom fields. Keys match member_profile_custom_field_definitions.key.';

-- 3. Recreate va_member_profile_view to include custom_field_values (keep security_invoker)
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
  p.custom_field_values
from public.profiles p
where p.role = 'member';

-- 4. Update get_va_member_context to return custom_field_values
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
  custom_field_values jsonb
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
    v.custom_field_values
  from public.va_member_profile_view v
  where v.member_id = v_mid;
end;
$$;
