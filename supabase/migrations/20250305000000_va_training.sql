-- VA Training: completion flag and admin-editable SOP sections.
-- VAs must complete onboarding then training before they can claim tickets.

-- 1. Add training_complete to va_profiles
alter table public.va_profiles
  add column if not exists training_complete boolean not null default false;

comment on column public.va_profiles.training_complete is 'VA must complete training (read sections + mark complete) before claiming tasks.';

-- 2. va_training_sections: admin-editable SOP content. Order by sort_order.
create table if not exists public.va_training_sections (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.va_training_sections is 'Training SOP sections for VAs. Admin/director can add, edit, reorder. VAs read-only.';

create index if not exists va_training_sections_sort_order on public.va_training_sections (sort_order asc);

alter table public.va_training_sections enable row level security;

-- SELECT: va, admin, director (VAs need to read training content)
create policy "va_training_sections_select_va_admin_director"
  on public.va_training_sections for select
  using (
    public.current_user_role() = 'va'
    or exists (select 1 from public.admins where user_id = auth.uid())
    or exists (select 1 from public.directors where user_id = auth.uid())
  );

-- INSERT/UPDATE/DELETE: admin, director only
create policy "va_training_sections_insert_admin_director"
  on public.va_training_sections for insert
  with check (
    exists (select 1 from public.admins where user_id = auth.uid())
    or exists (select 1 from public.directors where user_id = auth.uid())
  );

create policy "va_training_sections_update_admin_director"
  on public.va_training_sections for update
  using (
    exists (select 1 from public.admins where user_id = auth.uid())
    or exists (select 1 from public.directors where user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.admins where user_id = auth.uid())
    or exists (select 1 from public.directors where user_id = auth.uid())
  );

create policy "va_training_sections_delete_admin_director"
  on public.va_training_sections for delete
  using (
    exists (select 1 from public.admins where user_id = auth.uid())
    or exists (select 1 from public.directors where user_id = auth.uid())
  );

-- updated_at trigger
create or replace function public.va_training_sections_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists va_training_sections_updated_at on public.va_training_sections;
create trigger va_training_sections_updated_at
  before update on public.va_training_sections
  for each row execute function public.va_training_sections_updated_at();
