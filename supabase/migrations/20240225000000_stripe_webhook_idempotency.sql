-- Idempotency: avoid double-processing the same Stripe event on retries
create table if not exists public.stripe_webhook_events (
  event_id text primary key,
  processed_at timestamptz default now()
);

-- Subscription status for access control / UI (optional)
alter table public.profiles
  add column if not exists subscription_status text check (subscription_status is null or subscription_status in ('active', 'canceled'));
