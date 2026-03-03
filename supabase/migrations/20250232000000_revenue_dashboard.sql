-- Revenue dashboard: costs tracking and settings (CEO/CXO only).
-- Revenue data is fetched from Stripe API at read time; costs and settings live in DB.

-- 1. Cost entries (manual, upload, or preset)
create table if not exists public.revenue_costs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  amount numeric(12, 2) not null check (amount >= 0),
  category text not null check (category in (
    'va_cost', 'tips_payout', 'drins_pay', 'bonus', 'software', 'other', 'refund'
  )),
  month text not null check (month ~ '^\d{4}-\d{2}$'),
  is_paid boolean not null default false,
  paid_date date,
  notes text,
  source text not null default 'manual' check (source in ('manual', 'upload', 'preset')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists revenue_costs_month on public.revenue_costs (month desc);
create index if not exists revenue_costs_category on public.revenue_costs (category);

comment on table public.revenue_costs is 'Cost/expense entries for revenue dashboard. CEO/CXO only.';

-- 2. Dashboard settings (preset amounts, etc.)
create table if not exists public.revenue_dashboard_settings (
  key text primary key,
  value_json text not null,
  updated_at timestamptz not null default now()
);

comment on table public.revenue_dashboard_settings is 'Key-value settings for revenue dashboard (e.g. va_monthly_amount, drins_pay_monthly_amount).';

-- 3. updated_at trigger for revenue_costs
create or replace function public.set_revenue_costs_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists revenue_costs_updated_at on public.revenue_costs;
create trigger revenue_costs_updated_at
  before update on public.revenue_costs
  for each row execute function public.set_revenue_costs_updated_at();

-- 4. RLS: only admins and directors can read/write
alter table public.revenue_costs enable row level security;
alter table public.revenue_dashboard_settings enable row level security;

drop policy if exists "revenue_costs_admin_director" on public.revenue_costs;
create policy "revenue_costs_admin_director" on public.revenue_costs
  for all using (
    exists (select 1 from public.admins where user_id = auth.uid())
    or exists (select 1 from public.directors where user_id = auth.uid())
  );

drop policy if exists "revenue_dashboard_settings_admin_director" on public.revenue_dashboard_settings;
create policy "revenue_dashboard_settings_admin_director" on public.revenue_dashboard_settings
  for all using (
    exists (select 1 from public.admins where user_id = auth.uid())
    or exists (select 1 from public.directors where user_id = auth.uid())
  );
