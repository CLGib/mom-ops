-- VAs doing proactive check-ins can read member context only for members who qualify
-- as "stale" (same rules as va_get_stale_members), without an assigned ticket yet.

create or replace function public.va_member_qualifies_for_checkin_context(
  p_member_id uuid,
  p_days integer
)
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = p_member_id
      and p.role = 'member'
      and (
        not exists (
          select 1 from public.tickets t where t.member_id = p_member_id
        )
        or coalesce(
          (select max(t.updated_at) from public.tickets t where t.member_id = p_member_id),
          'epoch'::timestamptz
        ) < (now() - (p_days * interval '1 day'))
      )
  );
$$;

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
    'onboarding', v_quizzes->'onboarding'
  );
end;
$$;

comment on function public.va_get_member_context_for_checkin(uuid, integer) is
  'VA-only: returns profile + onboarding + quiz results for a member who qualifies for check-in outreach (stale window). No email/phone/stripe.';

comment on function public.va_member_qualifies_for_checkin_context(uuid, integer) is
  'True if member is on the check-in eligibility window (no tickets or last ticket older than p_days).';

grant execute on function public.va_get_member_context_for_checkin(uuid, integer) to authenticated;

-- Helper is internal only (would otherwise leak stale-member eligibility to any role).
revoke all on function public.va_member_qualifies_for_checkin_context(uuid, integer) from public;
