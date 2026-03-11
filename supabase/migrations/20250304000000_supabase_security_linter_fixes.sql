-- Supabase security linter fixes: RLS on webhook tables.
-- See: https://supabase.com/docs/guides/database/database-linter
--
-- Security definer views: va_member_profile_view fixed in 20250304300000 (recreated with
-- security_invoker + profiles_va_select_assigned_member policy). The other three
-- (admin_task_queue, member_credit_balances, va_unpaid_totals) are not in this repo;
-- fix in Supabase SQL if needed (recreate with security_invoker = on or use a DEFINER function).

-- 1. stripe_webhook_events: enable RLS; only service role (API routes) should read/write.
--    No permissive policies => anon/authenticated cannot access; service_role bypasses RLS.
alter table public.stripe_webhook_events enable row level security;

-- 2. inbound_email_events: same as above
alter table public.inbound_email_events enable row level security;
