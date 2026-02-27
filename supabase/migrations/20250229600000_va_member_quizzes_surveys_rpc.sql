-- VA can see member's quiz results, quiz responses (answers), and onboarding survey via RPC (assigned ticket only; no email)
create or replace function public.get_va_member_quizzes_and_surveys(p_ticket_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mid uuid;
  v_result jsonb;
begin
  select t.member_id into v_mid
  from public.tickets t
  where t.id = p_ticket_id
    and t.assigned_va_id = auth.uid();

  if v_mid is null then
    return null;
  end if;

  v_result := jsonb_build_object(
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
      where qr.member_id = v_mid),
      '[]'::jsonb
    ),
    'quiz_responses', coalesce(
      (select jsonb_agg(
        jsonb_build_object(
          'quiz_id', qr.quiz_id,
          'quiz_slug', q.slug,
          'quiz_title', q.title,
          'status', qr.status,
          'answers', qr.answers
        )
      )
      from public.quiz_responses qr
      join public.quizzes q on q.id = qr.quiz_id
      where qr.member_id = v_mid),
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
      where o.member_id = v_mid),
      '[]'::jsonb
    )
  );

  return v_result;
end;
$$;
