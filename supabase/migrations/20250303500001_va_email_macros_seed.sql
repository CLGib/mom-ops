-- Seed example email macros (optional: run only if you have an admin/director user to set as created_by).
-- Uses first admin user if present; otherwise first director; otherwise no insert.
do $$
declare
  v_creator_id uuid;
begin
  select user_id into v_creator_id from public.admins limit 1;
  if v_creator_id is null then
    select user_id into v_creator_id from public.directors limit 1;
  end if;
  if v_creator_id is not null and not exists (select 1 from public.va_email_macros limit 1) then
    insert into public.va_email_macros (name, body, category, created_by)
    values
      (
        'Acknowledgment + ETA',
        'Hi! I got your request and I''m on it. I''ll have an update for you within one business day. If you need anything sooner, just reply to this email.',
        'Acknowledgments',
        v_creator_id
      ),
      (
        'Task complete + invite edits',
        'Here’s what you asked for — I hope it works for you. If you’d like any tweaks or have a follow-up task, just reply and I’ll take care of it.',
        'Completions',
        v_creator_id
      );
  end if;
end;
$$;
