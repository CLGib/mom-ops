-- Newsletter subscribers (public content site). Insert via API only (service role); admin reads.

create table if not exists public.subscribers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  email text not null unique,
  source text,
  confirmed_at timestamptz,
  unsubscribed_at timestamptz
);

comment on table public.subscribers is 'Newsletter subscribers from the public content homepage. Insert via API (service role); only admin can read. email is unique (idempotent signup).';
comment on column public.subscribers.source is 'Where the signup came from (e.g. hero, newsletter-section) for light attribution.';
comment on column public.subscribers.confirmed_at is 'Set when/if double opt-in is confirmed. Null = single opt-in for now.';
comment on column public.subscribers.unsubscribed_at is 'Set when the subscriber opts out; keep the row for suppression.';

create index if not exists subscribers_created_at_desc
  on public.subscribers (created_at desc);

alter table public.subscribers enable row level security;

-- No insert policy: only the service role can insert (API uses the service client).
-- Admin can read the list.
create policy "subscribers_admin_select"
  on public.subscribers for select
  using (exists (select 1 from public.admins where user_id = auth.uid()));
