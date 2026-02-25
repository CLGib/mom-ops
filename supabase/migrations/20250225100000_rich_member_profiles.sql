-- Rich Member Profiles: extend profiles, onboarding_responses, VA-safe view, RPC

-- 1. Extend profiles with new columns (add if not exists, nullable unless default)
alter table public.profiles
  add column if not exists full_name text,
  add column if not exists preferred_name text,
  add column if not exists phone text,
  add column if not exists timezone text default 'America/Chicago',
  add column if not exists city text,
  add column if not exists state text,
  add column if not exists household_role text,
  add column if not exists contact_preference text default 'email' check (contact_preference in ('email', 'sms')),
  add column if not exists stripe_customer_id text unique,
  add column if not exists stripe_subscription_id text unique,
  add column if not exists partner_name text,
  add column if not exists kids_count integer,
  add column if not exists kids_ages jsonb,
  add column if not exists schools jsonb,
  add column if not exists activities jsonb,
  add column if not exists preferred_stores jsonb,
  add column if not exists preferred_brands jsonb,
  add column if not exists diet_notes text,
  add column if not exists important_dates jsonb,
  add column if not exists communication_tone text default 'warm' check (communication_tone in ('warm', 'direct', 'formal')),
  add column if not exists task_submission_preference text default 'either' check (task_submission_preference in ('email', 'portal', 'either')),
  add column if not exists typical_turnaround text default 'standard' check (typical_turnaround in ('standard', 'rush_when_possible')),
  add column if not exists budget_sensitivity text check (budget_sensitivity is null or budget_sensitivity in ('low', 'medium', 'high')),
  add column if not exists constraints text,
  add column if not exists profile_completion integer default 0,
  add column if not exists onboarding_completed_at timestamptz;

-- 2. New table: onboarding_responses
create table if not exists public.onboarding_responses (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references auth.users(id) on delete cascade,
  version integer not null default 1,
  answers jsonb not null,
  created_at timestamptz default now()
);

alter table public.onboarding_responses enable row level security;

drop policy if exists "onboarding_responses_member_select_own" on public.onboarding_responses;
drop policy if exists "onboarding_responses_member_insert_own" on public.onboarding_responses;
drop policy if exists "onboarding_responses_admin_select" on public.onboarding_responses;

create policy "onboarding_responses_member_select_own" on public.onboarding_responses
  for select using (member_id = auth.uid());

create policy "onboarding_responses_member_insert_own" on public.onboarding_responses
  for insert with check (member_id = auth.uid());

create policy "onboarding_responses_admin_select" on public.onboarding_responses
  for select using (public.current_user_role() = 'admin');

-- 3. VA-safe view (curated columns only; no phone, email, stripe ids)
create or replace view public.va_member_profile_view as
select
  p.id as member_id,
  p.preferred_name,
  p.full_name,
  p.timezone,
  p.city,
  p.state,
  p.kids_count,
  p.kids_ages,
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

-- 4. RPC: VA can get member context only for tickets they are assigned to
create or replace function public.get_va_member_context(p_ticket_id uuid)
returns table (
  member_id uuid,
  preferred_name text,
  full_name text,
  timezone text,
  city text,
  state text,
  kids_count integer,
  kids_ages jsonb,
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
