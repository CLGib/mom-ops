-- Store task drafts from /freetask landing; consumed on magic-link callback to /member.
create table if not exists public.freetask_drafts (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  subject text not null,
  description text,
  requested_va_id uuid null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours')
);

create index if not exists freetask_drafts_id_email_idx on public.freetask_drafts (id, email);

alter table public.freetask_drafts enable row level security;

-- No direct client access; only service role / server actions read by id.
create policy "freetask_drafts_no_select" on public.freetask_drafts for select using (false);
create policy "freetask_drafts_no_insert" on public.freetask_drafts for insert with check (false);
create policy "freetask_drafts_no_update" on public.freetask_drafts for update using (false);
create policy "freetask_drafts_no_delete" on public.freetask_drafts for delete using (false);

comment on table public.freetask_drafts is 'Drafts from /freetask form; consumed on /member after magic-link sign-in.';
