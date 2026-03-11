-- VA Community Hub: posts, comments, likes. VA-only; search and pagination via API.

-- 1. va_community_posts
create table if not exists public.va_community_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  title text,
  body text not null,
  ticket_id uuid references public.tickets(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.va_community_posts is 'VA community hub: questions and how-I-solved-it posts. VA-only.';
comment on column public.va_community_posts.ticket_id is 'Optional link to task (e.g. Re: Task #123).';

create index if not exists va_community_posts_created_at_idx
  on public.va_community_posts(created_at desc);

create index if not exists va_community_posts_author_id_idx
  on public.va_community_posts(author_id);

create index if not exists va_community_posts_ticket_id_idx
  on public.va_community_posts(ticket_id);

-- Search: plain text for ILIKE (no FTS column for now; can add tsvector later)
-- RLS will restrict to VAs only.

-- 2. va_community_comments
create table if not exists public.va_community_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.va_community_posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists va_community_comments_post_id_idx
  on public.va_community_comments(post_id);

create index if not exists va_community_comments_author_id_idx
  on public.va_community_comments(author_id);

-- 3. va_community_likes
create table if not exists public.va_community_likes (
  post_id uuid not null references public.va_community_posts(id) on delete cascade,
  va_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, va_id)
);

create index if not exists va_community_likes_post_id_idx
  on public.va_community_likes(post_id);

-- updated_at trigger for posts
drop trigger if exists va_community_posts_updated_at on public.va_community_posts;
create trigger va_community_posts_updated_at
  before update on public.va_community_posts
  for each row execute function public.set_updated_at();

-- RLS
alter table public.va_community_posts enable row level security;
alter table public.va_community_comments enable row level security;
alter table public.va_community_likes enable row level security;

-- Posts: any VA can read; VA can insert as self; VA can update/delete own
create policy "va_community_posts_select_va"
  on public.va_community_posts for select
  using (public.current_user_role() = 'va');

create policy "va_community_posts_insert_va"
  on public.va_community_posts for insert
  with check (public.current_user_role() = 'va' and author_id = auth.uid());

create policy "va_community_posts_update_own"
  on public.va_community_posts for update
  using (author_id = auth.uid())
  with check (author_id = auth.uid());

create policy "va_community_posts_delete_own"
  on public.va_community_posts for delete
  using (author_id = auth.uid());

-- Comments: any VA can read; VA can insert as self; VA can delete own
create policy "va_community_comments_select_va"
  on public.va_community_comments for select
  using (public.current_user_role() = 'va');

create policy "va_community_comments_insert_va"
  on public.va_community_comments for insert
  with check (public.current_user_role() = 'va' and author_id = auth.uid());

create policy "va_community_comments_delete_own"
  on public.va_community_comments for delete
  using (author_id = auth.uid());

-- Likes: any VA can read; VA can insert/delete own (toggle)
create policy "va_community_likes_select_va"
  on public.va_community_likes for select
  using (public.current_user_role() = 'va');

create policy "va_community_likes_insert_va"
  on public.va_community_likes for insert
  with check (public.current_user_role() = 'va' and va_id = auth.uid());

create policy "va_community_likes_delete_own"
  on public.va_community_likes for delete
  using (va_id = auth.uid());
