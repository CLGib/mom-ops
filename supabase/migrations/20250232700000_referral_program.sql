-- Referral program: member → member. Referrer and referred each get 15 credits when referred subscribes.

-- Track referrals (one row per referred user; idempotent for webhook)
create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.profiles(id) on delete cascade,
  referred_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  constraint referrals_referred_unique unique (referred_id),
  constraint referrals_not_self check (referrer_id <> referred_id)
);

create index if not exists referrals_referrer_id_idx on public.referrals (referrer_id);

comment on table public.referrals is 'Member referrals: referrer_id invited referred_id; credits granted on first subscription.';

-- Allow 'referral' type in credit_transactions (granted by webhook/service)
alter table public.credit_transactions
  drop constraint if exists credit_transactions_type_check;

alter table public.credit_transactions
  add constraint credit_transactions_type_check
  check (type in ('purchase', 'admin_adjustment', 'task_charge', 'referral'));

-- RLS: members can read their own referrals (as referrer or referred)
alter table public.referrals enable row level security;

drop policy if exists "referrals_select_own" on public.referrals;
create policy "referrals_select_own" on public.referrals
  for select using (referrer_id = auth.uid() or referred_id = auth.uid());

-- Only service role / webhook inserts referrals (no insert policy for app users)
