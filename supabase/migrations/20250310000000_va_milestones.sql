-- VA tier milestones and milestone bonuses (e.g. tier1_50 = $5 bonus).
-- Milestones are claimed server-side when VA hits threshold; bonuses feed into payout total.

-- va_milestones: one row per VA per milestone (idempotent claim)
create table if not exists public.va_milestones (
  va_id uuid not null references public.profiles(id) on delete cascade,
  milestone text not null,
  reached_at timestamptz not null default now(),
  primary key (va_id, milestone)
);

comment on table public.va_milestones is 'Tier milestones reached by VAs (e.g. tier1_50 = 50 completed tickets). Claimed once per VA.';

alter table public.va_milestones enable row level security;

drop policy if exists "va_milestones_va_select_own" on public.va_milestones;
create policy "va_milestones_va_select_own" on public.va_milestones
  for select using (va_id = auth.uid());

drop policy if exists "va_milestones_admin_all" on public.va_milestones;
create policy "va_milestones_admin_all" on public.va_milestones
  for all using (public.current_user_role() = 'admin');

-- va_milestone_bonuses: bonus payout per milestone (e.g. $5 = 500 cents for tier1_50)
create table if not exists public.va_milestone_bonuses (
  id uuid primary key default gen_random_uuid(),
  va_id uuid not null references public.profiles(id) on delete cascade,
  milestone_type text not null,
  amount_cents integer not null,
  created_at timestamptz not null default now()
);

comment on table public.va_milestone_bonuses is 'Bonus payouts for VA tier milestones (e.g. tier1_50 = $5). Included in VA payout total.';

alter table public.va_milestone_bonuses enable row level security;

drop policy if exists "va_milestone_bonuses_va_select_own" on public.va_milestone_bonuses;
create policy "va_milestone_bonuses_va_select_own" on public.va_milestone_bonuses
  for select using (va_id = auth.uid());

drop policy if exists "va_milestone_bonuses_admin_all" on public.va_milestone_bonuses;
create policy "va_milestone_bonuses_admin_all" on public.va_milestone_bonuses
  for all using (public.current_user_role() = 'admin');
