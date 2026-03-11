-- Allow 'profile_photo_bonus' in credit_transactions (one-time 5-credit reward for adding profile photo after first task).
-- RPC maybe_grant_profile_photo_bonus: call when member saves avatar; grants +5 once if eligible.

alter table public.credit_transactions
  drop constraint if exists credit_transactions_type_check;

alter table public.credit_transactions
  add constraint credit_transactions_type_check
  check (type in ('purchase', 'admin_adjustment', 'task_charge', 'referral', 'survey_reward', 'profile_photo_bonus'));

create or replace function public.maybe_grant_profile_photo_bonus(p_member_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or auth.uid() <> p_member_id then
    return;
  end if;

  if not exists (
    select 1 from public.profiles
    where id = p_member_id and avatar_url is not null and trim(avatar_url) <> ''
  ) then
    return;
  end if;

  if not exists (
    select 1 from public.tickets
    where member_id = p_member_id and status in ('completed', 'closed')
  ) then
    return;
  end if;

  if exists (
    select 1 from public.credit_transactions
    where member_id = p_member_id and type = 'profile_photo_bonus'
  ) then
    return;
  end if;

  insert into public.credit_transactions (member_id, amount, type)
  values (p_member_id, 5, 'profile_photo_bonus');
end;
$$;

comment on function public.maybe_grant_profile_photo_bonus(uuid) is 'One-time 5-credit bonus when member has avatar and at least one completed task; idempotent.';
