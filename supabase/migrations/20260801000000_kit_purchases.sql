-- Kit store: per-user ownership of purchased kits.
-- Entitlement to a kit = a row here for that member+kit, OR an active subscription
-- (all-access) checked in app code (src/lib/kit-access.ts).

create table if not exists public.kit_purchases (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles(id) on delete cascade,
  kit_id text not null,
  stripe_session_id text unique,
  created_at timestamptz not null default now()
);

create index if not exists kit_purchases_member_idx on public.kit_purchases (member_id);
create index if not exists kit_purchases_member_kit_idx on public.kit_purchases (member_id, kit_id);

alter table public.kit_purchases enable row level security;

-- Members can see their own purchases. Inserts happen via the service role
-- (Stripe webhook) only — no insert policy on purpose.
drop policy if exists kit_purchases_select_own on public.kit_purchases;
create policy kit_purchases_select_own on public.kit_purchases
  for select using (member_id = auth.uid());
