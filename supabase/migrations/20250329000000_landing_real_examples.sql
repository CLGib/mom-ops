-- Landing "Explore real examples" — editable by CEO in admin; public read on marketing.
create table if not exists public.landing_real_examples (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  request_text text not null default '',
  deliverable_images jsonb, -- array of image URLs, e.g. ["/assets/foo.png", "/assets/bar.png"]
  deliverable_pdf text,     -- single PDF URL when deliverable is a PDF
  caption text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint landing_real_examples_has_deliverable check (
    (deliverable_images is not null and jsonb_array_length(deliverable_images) > 0)
    or (deliverable_pdf is not null and trim(deliverable_pdf) != '')
  )
);

comment on table public.landing_real_examples is 'Real task examples for the marketing "Explore real examples" section. CEO manages in admin.';

create index if not exists landing_real_examples_sort on public.landing_real_examples (sort_order, id);

alter table public.landing_real_examples enable row level security;

-- Public read (marketing page, unauthenticated)
create policy "landing_real_examples_select_public"
  on public.landing_real_examples for select
  using (true);

-- Admin-only write
create policy "landing_real_examples_insert_admin"
  on public.landing_real_examples for insert
  with check (
    exists (select 1 from public.admins where user_id = auth.uid())
  );

create policy "landing_real_examples_update_admin"
  on public.landing_real_examples for update
  using (exists (select 1 from public.admins where user_id = auth.uid()))
  with check (exists (select 1 from public.admins where user_id = auth.uid()));

create policy "landing_real_examples_delete_admin"
  on public.landing_real_examples for delete
  using (exists (select 1 from public.admins where user_id = auth.uid()));

-- updated_at trigger
create or replace function public.landing_real_examples_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists landing_real_examples_updated_at on public.landing_real_examples;
create trigger landing_real_examples_updated_at
  before update on public.landing_real_examples
  for each row execute function public.landing_real_examples_updated_at();
