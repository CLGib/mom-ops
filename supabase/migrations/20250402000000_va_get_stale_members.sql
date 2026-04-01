-- Members with no ticket activity recently (for VA proactive outreach / "find work").
-- VA-only; uses security definer to aggregate across tickets without loading all rows client-side.

create or replace function public.va_get_stale_members(
  p_days integer default 14,
  p_limit integer default 50
)
returns table (
  member_id uuid,
  last_ticket_at timestamptz,
  last_ticket_id uuid,
  preferred_name text,
  full_name text,
  avatar_url text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_days integer;
  v_limit integer;
begin
  if public.current_user_role() is distinct from 'va' then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  v_days := coalesce(nullif(p_days, 0), 14);
  if v_days < 1 then
    v_days := 14;
  end if;
  if v_days > 365 then
    v_days := 365;
  end if;

  v_limit := coalesce(nullif(p_limit, 0), 50);
  if v_limit < 1 then
    v_limit := 50;
  end if;
  if v_limit > 200 then
    v_limit := 200;
  end if;

  return query
  with last_per_member as (
    select distinct on (t.member_id)
      t.member_id,
      t.id as ticket_id,
      t.updated_at as last_at
    from public.tickets t
    order by t.member_id, t.updated_at desc
  )
  select
    p.id as member_id,
    l.last_at as last_ticket_at,
    l.ticket_id as last_ticket_id,
    p.preferred_name,
    p.full_name,
    p.avatar_url
  from public.profiles p
  left join last_per_member l on l.member_id = p.id
  where p.role = 'member'
    and (
      l.last_at is null
      or l.last_at < (now() - (v_days * interval '1 day'))
    )
  order by l.last_at asc nulls first
  limit v_limit;
end;
$$;

comment on function public.va_get_stale_members(integer, integer) is
  'Returns members with no ticket updated in the last p_days (or no tickets ever), for VA check-in outreach. VA role only.';

grant execute on function public.va_get_stale_members(integer, integer) to authenticated;
