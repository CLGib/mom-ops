-- Team-visible log for VA outreach (e.g. recurring task suggestion sent). Append-only; members have no access.

create table if not exists public.va_team_member_events (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles (id) on delete cascade,
  event_type text not null,
  note_text text,
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint va_team_member_events_event_type_check check (event_type = 'recurring_outreach'),
  constraint va_team_member_events_note_len check (note_text is null or char_length(note_text) <= 500)
);

comment on table public.va_team_member_events is
  'Staff-only events about a member (e.g. recurring outreach logged). Visible to all VAs; not shown to members.';

create index if not exists va_team_member_events_member_created
  on public.va_team_member_events (member_id, created_at desc);

alter table public.va_team_member_events enable row level security;

create policy "va_team_member_events_select_staff"
  on public.va_team_member_events
  for select
  using (
    public.current_user_role() in ('va', 'admin', 'director')
    and exists (
      select 1 from public.profiles p
      where p.id = va_team_member_events.member_id
        and p.role = 'member'
    )
  );

create policy "va_team_member_events_insert_va"
  on public.va_team_member_events
  for insert
  with check (
    public.current_user_role() = 'va'
    and created_by = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = va_team_member_events.member_id
        and p.role = 'member'
    )
  );

-- Extend check-in context bundle with recent recurring-outreach logs (SECURITY DEFINER reads all rows for member).
create or replace function public.va_get_member_context_for_checkin(
  p_member_id uuid,
  p_days integer default 14
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_days integer;
  v_profile jsonb;
  v_quizzes jsonb;
  v_events jsonb;
begin
  if public.current_user_role() is distinct from 'va' then
    return null;
  end if;

  v_days := coalesce(nullif(p_days, 0), 14);
  if v_days < 1 then
    v_days := 14;
  end if;
  if v_days > 365 then
    v_days := 365;
  end if;

  if not public.va_member_qualifies_for_checkin_context(p_member_id, v_days) then
    return null;
  end if;

  select jsonb_build_object(
    'member_id', p.id,
    'preferred_name', p.preferred_name,
    'full_name', p.full_name,
    'partner_name', p.partner_name,
    'timezone', p.timezone,
    'city', p.city,
    'state', p.state,
    'kids_count', p.kids_count,
    'kids_ages', p.kids_ages,
    'household_members', p.household_members,
    'schools', p.schools,
    'activities', p.activities,
    'preferred_stores', p.preferred_stores,
    'preferred_brands', p.preferred_brands,
    'communication_tone', p.communication_tone,
    'constraints', p.constraints,
    'important_dates', p.important_dates,
    'task_submission_preference', p.task_submission_preference,
    'typical_turnaround', p.typical_turnaround,
    'custom_field_values', p.custom_field_values,
    'holidays_celebrated', p.holidays_celebrated
  )
  into v_profile
  from public.profiles p
  where p.id = p_member_id
    and p.role = 'member';

  if v_profile is null then
    return null;
  end if;

  select coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'id', r.id,
          'event_type', r.event_type,
          'note_text', r.note_text,
          'created_at', r.created_at,
          'created_by', r.created_by,
          'created_by_display_name', r.dn
        )
        order by r.created_at desc
      )
      from (
        select e.id, e.event_type, e.note_text, e.created_at, e.created_by, vp.display_name as dn
        from public.va_team_member_events e
        left join public.va_profiles vp on vp.user_id = e.created_by
        where e.member_id = p_member_id
          and e.event_type = 'recurring_outreach'
        order by e.created_at desc
        limit 10
      ) r
    ),
    '[]'::jsonb
  )
  into v_events;

  v_quizzes := jsonb_build_object(
    'quiz_results', coalesce(
      (select jsonb_agg(
        jsonb_build_object(
          'quiz_id', qr.quiz_id,
          'quiz_slug', q.slug,
          'quiz_title', q.title,
          'outcome_slug', qr.outcome_slug,
          'outcome_title', qr.outcome_title,
          'outcome_description', qr.outcome_description,
          'completed_at', qr.completed_at
        ) order by qr.completed_at desc
      )
      from public.quiz_results qr
      join public.quizzes q on q.id = qr.quiz_id
      where qr.member_id = p_member_id),
      '[]'::jsonb
    ),
    'onboarding', coalesce(
      (select jsonb_agg(
        jsonb_build_object(
          'answers', o.answers,
          'created_at', o.created_at
        ) order by o.created_at desc
      )
      from public.onboarding_responses o
      where o.member_id = p_member_id),
      '[]'::jsonb
    )
  );

  return jsonb_build_object(
    'profile', v_profile,
    'quiz_results', v_quizzes->'quiz_results',
    'onboarding', v_quizzes->'onboarding',
    'recurring_outreach_events', coalesce(v_events, '[]'::jsonb)
  );
end;
$$;

comment on function public.va_get_member_context_for_checkin(uuid, integer) is
  'VA-only: returns profile + onboarding + quiz + team recurring-outreach log for check-in-eligible members.';

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
  holidays_celebrated jsonb,
  recurring_outreach_events jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mid uuid;
  v_events jsonb;
begin
  select t.member_id into v_mid
  from public.tickets t
  where t.id = p_ticket_id
    and t.assigned_va_id = auth.uid();

  if v_mid is null then
    return;
  end if;

  select coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'id', r.id,
          'event_type', r.event_type,
          'note_text', r.note_text,
          'created_at', r.created_at,
          'created_by', r.created_by,
          'created_by_display_name', r.dn
        )
        order by r.created_at desc
      )
      from (
        select e.id, e.event_type, e.note_text, e.created_at, e.created_by, vp.display_name as dn
        from public.va_team_member_events e
        left join public.va_profiles vp on vp.user_id = e.created_by
        where e.member_id = v_mid
          and e.event_type = 'recurring_outreach'
        order by e.created_at desc
        limit 10
      ) r
    ),
    '[]'::jsonb
  )
  into v_events;

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
    v.holidays_celebrated,
    coalesce(v_events, '[]'::jsonb) as recurring_outreach_events
  from public.va_member_profile_view v
  where v.member_id = v_mid;
end;
$$;
