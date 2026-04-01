-- Free trial A/B test: profile flag, credit type, ticket flags, and hot trigger for free-trial tasks.

-- 1. profiles: mark member as having taken the free-trial offer (one-time 35 credits)
alter table public.profiles
  add column if not exists is_free_trial boolean default false;

comment on column public.profiles.is_free_trial is 'True if member signed up via free-trial offer and received one-time 35 credits.';

-- 2. credit_transactions: allow type 'free_trial' for the one-time grant
alter table public.credit_transactions
  drop constraint if exists credit_transactions_type_check;

alter table public.credit_transactions
  add constraint credit_transactions_type_check
  check (type in ('purchase', 'admin_adjustment', 'task_charge', 'referral', 'survey_reward', 'profile_photo_bonus', 'free_trial'));

-- 3. tickets: free-trial task (VA sees badge, gets hot bonus when claiming) and first-task flag
alter table public.tickets
  add column if not exists is_free_trial_task boolean default false,
  add column if not exists is_member_first_task boolean default false;

comment on column public.tickets.is_free_trial_task is 'True when the task was created by a member who is on free trial; VA sees badge and earns hot bonus when claiming.';
comment on column public.tickets.is_member_first_task is 'True when this is the member''s first task (only ticket for that member at insert time).';

-- 4. Hot trigger: free-trial tasks count as hot when claimed (so VA gets 10% bonus)
create or replace function public.set_was_hot_when_claimed()
returns trigger as $$
begin
  if old.assigned_va_id is null and new.assigned_va_id is not null then
    new.was_hot_when_claimed := coalesce(new.is_free_trial_task, false)
      or (
        current_timestamp - old.created_at >= case when coalesce(old.no_rush, false) then interval '24 hours' else interval '6 hours' end
      );
  end if;
  return new;
end;
$$ language plpgsql security definer;
