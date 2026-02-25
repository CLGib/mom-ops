-- Quiz Engine: data-driven quizzes, results, and profile merge for VA opportunity mining

-- 1. Quizzes (metadata)
create table if not exists public.quizzes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. Quiz outcomes (title + description per outcome per quiz)
create table if not exists public.quiz_outcomes (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  outcome_slug text not null,
  title text not null,
  description text,
  sort_order int not null default 0,
  created_at timestamptz default now(),
  unique (quiz_id, outcome_slug)
);

-- 3. Questions (single_choice or multi_choice)
create table if not exists public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  sort_order int not null default 0,
  question_text text not null,
  question_type text not null check (question_type in ('single_choice', 'multi_choice')),
  created_at timestamptz default now()
);

-- 4. Options (option_text, outcome_slug + points for scoring, profile_writes for merge)
create table if not exists public.quiz_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.quiz_questions(id) on delete cascade,
  sort_order int not null default 0,
  option_text text not null,
  outcome_slug text,
  points int not null default 0,
  profile_writes jsonb,
  created_at timestamptz default now()
);

-- 5. Results (one row per completion; allow retakes = multiple rows per member per quiz)
create table if not exists public.quiz_results (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references auth.users(id) on delete cascade,
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  outcome_slug text not null,
  outcome_title text not null,
  outcome_description text,
  completed_at timestamptz default now(),
  created_at timestamptz default now()
);

-- 6. In-progress / completed responses (one row per member per quiz, upserted)
create table if not exists public.quiz_responses (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references auth.users(id) on delete cascade,
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  status text not null check (status in ('in_progress', 'completed')),
  answers jsonb not null default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (member_id, quiz_id)
);

-- 7. Extend profiles for quiz-derived traits (VA opportunity mining)
alter table public.profiles
  add column if not exists stress_triggers jsonb,
  add column if not exists community_roles jsonb,
  add column if not exists home_aesthetic text,
  add column if not exists household jsonb,
  add column if not exists recurring_events jsonb;

-- 8. RLS
alter table public.quizzes enable row level security;
alter table public.quiz_outcomes enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_options enable row level security;
alter table public.quiz_results enable row level security;
alter table public.quiz_responses enable row level security;

-- Quizzes, outcomes, questions, options: read-only for authenticated
drop policy if exists "quizzes_select_authenticated" on public.quizzes;
create policy "quizzes_select_authenticated" on public.quizzes
  for select to authenticated using (true);

drop policy if exists "quiz_outcomes_select_authenticated" on public.quiz_outcomes;
create policy "quiz_outcomes_select_authenticated" on public.quiz_outcomes
  for select to authenticated using (true);

drop policy if exists "quiz_questions_select_authenticated" on public.quiz_questions;
create policy "quiz_questions_select_authenticated" on public.quiz_questions
  for select to authenticated using (true);

drop policy if exists "quiz_options_select_authenticated" on public.quiz_options;
create policy "quiz_options_select_authenticated" on public.quiz_options
  for select to authenticated using (true);

-- Quiz results: member select/insert own
drop policy if exists "quiz_results_select_own" on public.quiz_results;
drop policy if exists "quiz_results_insert_own" on public.quiz_results;
create policy "quiz_results_select_own" on public.quiz_results
  for select using (member_id = auth.uid());
create policy "quiz_results_insert_own" on public.quiz_results
  for insert with check (member_id = auth.uid());

-- Quiz responses: member select, insert, update own; admin select
drop policy if exists "quiz_responses_select_own" on public.quiz_responses;
drop policy if exists "quiz_responses_insert_own" on public.quiz_responses;
drop policy if exists "quiz_responses_update_own" on public.quiz_responses;
drop policy if exists "quiz_responses_admin_select" on public.quiz_responses;
create policy "quiz_responses_select_own" on public.quiz_responses
  for select using (member_id = auth.uid());
create policy "quiz_responses_insert_own" on public.quiz_responses
  for insert with check (member_id = auth.uid());
create policy "quiz_responses_update_own" on public.quiz_responses
  for update using (member_id = auth.uid());
create policy "quiz_responses_admin_select" on public.quiz_responses
  for select using (exists (select 1 from public.admins where user_id = auth.uid()));
