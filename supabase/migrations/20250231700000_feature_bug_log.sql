-- Feature & Bug Log: kanban board for Admin/Director; submission from all roles.

-- 1. Cards: type (feature|bug), title, description, status, requestor, owner (admin/director), optional attachment
create table if not exists public.feature_bug_cards (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('feature', 'bug')),
  title text not null,
  description text,
  status text not null default 'backlog' check (status in ('backlog', 'in_progress', 'qa', 'done', 'wont_fix')),
  requestor_id uuid references auth.users(id) on delete set null,
  requestor_role text not null check (requestor_role in ('member', 'va', 'admin', 'director')),
  requestor_email text,
  owner_id uuid references auth.users(id) on delete set null,
  attachment_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.feature_bug_cards is 'Feature requests and bug reports. All roles submit; Admin/Director manage board.';
comment on column public.feature_bug_cards.requestor_email is 'Denormalized for notification when card moves to Done.';

create index if not exists feature_bug_cards_status on public.feature_bug_cards (status);
create index if not exists feature_bug_cards_requestor on public.feature_bug_cards (requestor_id);

-- 2. Internal notes on a card (Admin/Director only)
create table if not exists public.feature_bug_notes (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.feature_bug_cards(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  note_text text not null,
  created_at timestamptz not null default now()
);

create index if not exists feature_bug_notes_card on public.feature_bug_notes (card_id);

alter table public.feature_bug_cards enable row level security;
alter table public.feature_bug_notes enable row level security;

-- Anyone authenticated can insert a card (submitter)
create policy "feature_bug_cards_insert_authenticated"
  on public.feature_bug_cards for insert
  with check (auth.uid() is not null);

-- Admin/Director can select and update all cards
create policy "feature_bug_cards_admin_director_all"
  on public.feature_bug_cards for all
  using (
    exists (select 1 from public.admins where user_id = auth.uid())
    or exists (select 1 from public.directors where user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.admins where user_id = auth.uid())
    or exists (select 1 from public.directors where user_id = auth.uid())
  );

-- Requestor can select their own cards (to see status)
create policy "feature_bug_cards_requestor_select"
  on public.feature_bug_cards for select
  using (requestor_id = auth.uid() or requestor_id is null);

-- Notes: Admin/Director only
create policy "feature_bug_notes_admin_director_all"
  on public.feature_bug_notes for all
  using (
    exists (select 1 from public.admins where user_id = auth.uid())
    or exists (select 1 from public.directors where user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.admins where user_id = auth.uid())
    or exists (select 1 from public.directors where user_id = auth.uid())
  );

-- Trigger: updated_at
create or replace function public.feature_bug_cards_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists feature_bug_cards_updated_at on public.feature_bug_cards;
create trigger feature_bug_cards_updated_at
  before update on public.feature_bug_cards
  for each row execute function public.feature_bug_cards_updated_at();
