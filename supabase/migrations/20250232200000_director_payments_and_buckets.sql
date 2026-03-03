-- CXO (Director) payments with bucket tracking. CEO records payouts and debits the correct bucket.

-- Buckets: five_star (5-star review bonus), nps_bonus, ceo_bonus, va_onboarded, ticket_pay, tips
-- Earned: five_star computed from task_reviews; others from director_adjustments (CEO adds credits)
-- Paid: director_payments (CEO records when paying CXO)
-- Balance per bucket = earned - paid

create table if not exists public.director_adjustments (
  id uuid primary key default gen_random_uuid(),
  director_id uuid not null references public.profiles(id) on delete cascade,
  bucket text not null check (bucket in ('five_star', 'nps_bonus', 'ceo_bonus', 'va_onboarded', 'ticket_pay', 'tips')),
  amount_cents integer not null check (amount_cents > 0),
  note text,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id)
);

create index if not exists director_adjustments_director on public.director_adjustments (director_id);
create index if not exists director_adjustments_bucket on public.director_adjustments (bucket);

comment on table public.director_adjustments is 'Credits added to CXO buckets (CEO bonuses, NPS, VA onboarded, etc). five_star is computed from task_reviews.';

create table if not exists public.director_payments (
  id uuid primary key default gen_random_uuid(),
  director_id uuid not null references public.profiles(id) on delete cascade,
  bucket text not null check (bucket in ('five_star', 'nps_bonus', 'ceo_bonus', 'va_onboarded', 'ticket_pay', 'tips')),
  amount_cents integer not null check (amount_cents > 0),
  note text,
  paid_at timestamptz not null default now(),
  created_by uuid references public.profiles(id)
);

create index if not exists director_payments_director on public.director_payments (director_id);
create index if not exists director_payments_bucket on public.director_payments (bucket);

comment on table public.director_payments is 'Recorded payouts to CXOs. Debits the specified bucket.';

alter table public.director_adjustments enable row level security;
alter table public.director_payments enable row level security;

drop policy if exists "director_adjustments_admin" on public.director_adjustments;
create policy "director_adjustments_admin" on public.director_adjustments
  for all using (exists (select 1 from public.admins where user_id = auth.uid()));

drop policy if exists "director_adjustments_director_select" on public.director_adjustments;
create policy "director_adjustments_director_select" on public.director_adjustments
  for select using (director_id = auth.uid());

drop policy if exists "director_payments_admin" on public.director_payments;
create policy "director_payments_admin" on public.director_payments
  for all using (exists (select 1 from public.admins where user_id = auth.uid()));

drop policy if exists "director_payments_director_select" on public.director_payments;
create policy "director_payments_director_select" on public.director_payments
  for select using (director_id = auth.uid());
