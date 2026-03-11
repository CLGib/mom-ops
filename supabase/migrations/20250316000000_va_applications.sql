-- VA application quiz submissions (public apply flow). Insert via API only (service role); select for admin/director.

create table if not exists public.va_applications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  email text not null,
  name text,
  attention_score_pct smallint check (attention_score_pct is null or (attention_score_pct >= 0 and attention_score_pct <= 100)),
  attention_details jsonb,
  creative_response text
);

comment on table public.va_applications is 'VA candidate applications from public /va-apply quiz. Insert via API (service role); only admin/director can read.';
comment on column public.va_applications.attention_score_pct is 'Percentage of attention-to-detail questions answered correctly (0-100).';
comment on column public.va_applications.attention_details is 'Per-question correct/incorrect breakdown for CEO review.';

create index if not exists va_applications_created_at_desc
  on public.va_applications (created_at desc);

alter table public.va_applications enable row level security;

-- No insert policy: only service role can insert (API uses service client).
-- Admin and director can read for CEO review.
create policy "va_applications_admin_select"
  on public.va_applications for select
  using (exists (select 1 from public.admins where user_id = auth.uid()));

create policy "va_applications_director_select"
  on public.va_applications for select
  using (exists (select 1 from public.directors where user_id = auth.uid()));
