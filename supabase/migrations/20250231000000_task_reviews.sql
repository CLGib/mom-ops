-- Public task reviews feed (Venmo-style). Member submits rating + optional comment with visibility (public/private).
-- task_subject is denormalized from ticket.subject at review time so edits do not change history.

create table if not exists public.task_reviews (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tickets(id) on delete cascade,
  member_id uuid not null references public.profiles(id) on delete cascade,
  va_id uuid references public.profiles(id) on delete set null,
  task_subject text not null,
  rating integer not null check (rating >= 1 and rating <= 5),
  comment text,
  visibility text not null default 'private' check (visibility in ('private', 'public')),
  is_flagged boolean not null default false,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint task_reviews_one_per_task unique (task_id)
);

comment on column public.task_reviews.task_subject is 'Snapshot of ticket.subject at review time.';
comment on column public.task_reviews.visibility is 'Member-controlled: public (show in feed) or private.';
comment on column public.task_reviews.is_hidden is 'Admin can hide a review from the public feed.';

create index if not exists task_reviews_visibility_hidden_created
  on public.task_reviews (visibility, is_hidden, created_at desc)
  where visibility = 'public' and is_hidden = false;

create index if not exists task_reviews_member_id on public.task_reviews (member_id);

alter table public.task_reviews enable row level security;

-- Members can insert their own review (when submitting; enforced by app to one per task).
create policy "task_reviews_insert_own" on public.task_reviews
  for insert with check (member_id = auth.uid());

-- Members can select their own reviews (for "My reviews").
create policy "task_reviews_select_own" on public.task_reviews
  for select using (member_id = auth.uid());

-- Members can update their own review (comment, visibility only in app).
create policy "task_reviews_update_own" on public.task_reviews
  for update using (member_id = auth.uid());

-- Authenticated members can read public, non-hidden reviews (for feed). Use a separate policy so feed query works.
create policy "task_reviews_select_public" on public.task_reviews
  for select using (
    visibility = 'public' and is_hidden = false
  );

-- Admin full access (for moderation).
create policy "task_reviews_admin_all" on public.task_reviews
  for all using (exists (select 1 from public.admins where user_id = auth.uid()));

-- updated_at trigger
create or replace function public.task_reviews_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists task_reviews_updated_at on public.task_reviews;
create trigger task_reviews_updated_at
  before update on public.task_reviews
  for each row execute function public.task_reviews_updated_at();

-- Feed: return public reviews with member display_name and avatar_url (bypasses profiles RLS for read-only feed).
create or replace function public.get_public_reviews_feed(
  p_search text default null,
  p_rating_filter text default 'all',
  p_limit int default 20,
  p_offset int default 0
)
returns table (
  id uuid,
  task_subject text,
  rating int,
  comment text,
  created_at timestamptz,
  member_id uuid,
  display_name text,
  avatar_url text,
  va_id uuid
)
language plpgsql security definer set search_path = public stable as $$
begin
  return query
  select
    r.id,
    r.task_subject,
    r.rating,
    r.comment,
    r.created_at,
    r.member_id,
    coalesce(p.display_name, p.preferred_name, p.full_name, 'Anonymous')::text as display_name,
    p.avatar_url,
    r.va_id
  from public.task_reviews r
  join public.profiles p on p.id = r.member_id
  where r.visibility = 'public'
    and r.is_hidden = false
    and (p_search is null or p_search = '' or (
      r.task_subject ilike '%' || trim(p_search) || '%' or
      (r.comment is not null and r.comment ilike '%' || trim(p_search) || '%')
    ))
    and (
      p_rating_filter = 'all' or
      (p_rating_filter = '5' and r.rating = 5) or
      (p_rating_filter = '4+' and r.rating >= 4)
    )
  order by r.created_at desc
  limit greatest(1, least(p_limit, 100))
  offset greatest(0, p_offset);
end;
$$;

grant execute on function public.get_public_reviews_feed(text, text, int, int) to authenticated;
grant execute on function public.get_public_reviews_feed(text, text, int, int) to anon;
