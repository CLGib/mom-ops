-- NPS (Net Promoter Score) survey: store submit or dismiss per user.
-- Used to show popover after 3 completed tasks; suppress for 6 months after submit/dismiss.

create table if not exists public.nps_responses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  score smallint check (score is null or (score >= 0 and score <= 10)),
  comment text,
  dismissed boolean not null default false,
  created_at timestamptz not null default now()
);

comment on table public.nps_responses is 'NPS survey: one row per submit or dismiss. Last row per user determines next eligible date (6 months later).';
comment on column public.nps_responses.dismissed is 'True when user closed without submitting; then score/comment are null.';
comment on column public.nps_responses.score is '0-10 NPS score; null when dismissed.';

create index if not exists nps_responses_user_id_created_at
  on public.nps_responses (user_id, created_at desc);

alter table public.nps_responses enable row level security;

-- Members can insert their own response (submit or dismiss)
create policy "nps_responses_insert_own"
  on public.nps_responses for insert
  with check (auth.uid() = user_id);

-- Members can read own (for optional client-side last date check)
create policy "nps_responses_select_own"
  on public.nps_responses for select
  using (auth.uid() = user_id);

-- Admin/director read for analytics
create policy "nps_responses_admin_select"
  on public.nps_responses for select
  using (exists (select 1 from public.admins where user_id = auth.uid()));

create policy "nps_responses_director_select"
  on public.nps_responses for select
  using (exists (select 1 from public.directors where user_id = auth.uid()));
