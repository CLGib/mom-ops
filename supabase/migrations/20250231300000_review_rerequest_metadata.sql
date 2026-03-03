-- Review re-request: ticket metadata + task_reviews category + feed VA name
-- Enables "Have This Specialist Do This For Me" and analytics (conversion from reviews).

-- 1. Tickets: category (template/category), source_review_id, created_from_review
alter table public.tickets
  add column if not exists category text,
  add column if not exists source_review_id uuid references public.task_reviews(id) on delete set null,
  add column if not exists created_from_review boolean not null default false;

comment on column public.tickets.category is 'Template/category slug when created (e.g. household, school).';
comment on column public.tickets.source_review_id is 'When created from a review CTA, the review id.';
comment on column public.tickets.created_from_review is 'True when ticket was created via "Have This Specialist Do This For Me".';

-- 2. Task reviews: category snapshot for filtering feed
alter table public.task_reviews
  add column if not exists category text;

comment on column public.task_reviews.category is 'Snapshot of ticket.category at review time for feed filter.';

-- 3. Extend get_public_reviews_feed: return va_display_name, category; filter by p_category
drop function if exists public.get_public_reviews_feed(text, text, int, int);

create or replace function public.get_public_reviews_feed(
  p_search text default null,
  p_rating_filter text default 'all',
  p_category text default null,
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
  va_id uuid,
  va_display_name text,
  category text
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
    r.va_id,
    coalesce(vp.display_name, p_va.preferred_name, p_va.full_name, 'Specialist')::text as va_display_name,
    r.category
  from public.task_reviews r
  join public.profiles p on p.id = r.member_id
  left join public.profiles p_va on p_va.id = r.va_id
  left join public.va_profiles vp on vp.user_id = r.va_id
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
    and (p_category is null or p_category = '' or r.category = p_category)
  order by r.created_at desc
  limit greatest(1, least(p_limit, 100))
  offset greatest(0, p_offset);
end;
$$;

grant execute on function public.get_public_reviews_feed(text, text, text, int, int) to authenticated;
grant execute on function public.get_public_reviews_feed(text, text, text, int, int) to anon;
