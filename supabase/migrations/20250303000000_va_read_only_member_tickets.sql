-- Allow VAs to view all tickets (read-only when not assigned) so they can see past tickets of members.

-- 1. Tickets: VA can SELECT any ticket (read-only; update still restricted to assigned/claim)
create policy "tickets_va_select_any" on public.tickets
  for select using (public.current_user_role() = 'va');

-- 2. ticket_messages: VA can SELECT messages for any ticket (to read thread when viewing read-only)
create policy "ticket_messages_select_va_any" on public.ticket_messages
  for select using (
    public.current_user_role() = 'va'
    and exists (select 1 from public.tickets t where t.id = ticket_id)
  );

-- 3. ticket_attachments: allow VA to select attachments for any ticket (for read-only view)
create or replace function public.ticket_attachments_va_can_select(p_ticket_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    return false;
  end if;
  -- VA can read attachments for tickets assigned to them OR any ticket (read-only member context)
  return exists (
    select 1 from public.tickets t
    where t.id = p_ticket_id
    and (
      t.assigned_va_id = v_user_id
      or public.current_user_role() = 'va'
    )
  );
end;
$$;

-- 4. get_va_member_context: allow any VA to get member context for any ticket (for read-only view)
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
  v_can_see boolean;
begin
  select t.member_id into v_mid
  from public.tickets t
  where t.id = p_ticket_id;

  if v_mid is null then
    return;
  end if;

  -- Allow if assigned to this VA or if caller is any VA (read-only member context)
  v_can_see := exists (
    select 1 from public.tickets t
    where t.id = p_ticket_id
    and (t.assigned_va_id = auth.uid() or public.current_user_role() = 'va')
  );
  if not v_can_see then
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
