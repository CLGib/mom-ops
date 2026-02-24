-- Idempotency for inbound email webhook: avoid processing the same Resend email_id twice
create table if not exists public.inbound_email_events (
  email_id text primary key,
  processed_at timestamptz default now()
);
