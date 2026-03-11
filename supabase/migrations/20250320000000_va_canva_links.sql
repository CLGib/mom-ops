-- VA Resources: Canva design links for reuse. Any VA (or admin/director) can add and view; only owner can edit/delete.

create table if not exists public.va_canva_links (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  title text,
  description text,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.va_canva_links is 'Canva design links for VA reuse. VA, admin, director can view and add; only owner can edit/delete.';

create index if not exists va_canva_links_created_at on public.va_canva_links (created_at desc);
create index if not exists va_canva_links_created_by on public.va_canva_links (created_by);

alter table public.va_canva_links enable row level security;

-- SELECT: va, admin, director
create policy "va_canva_links_select_va_admin_director"
  on public.va_canva_links for select
  using (
    public.current_user_role() = 'va'
    or exists (select 1 from public.admins where user_id = auth.uid())
    or exists (select 1 from public.directors where user_id = auth.uid())
  );

-- INSERT: va, admin, director; must set created_by = self
create policy "va_canva_links_insert_va_admin_director"
  on public.va_canva_links for insert
  with check (
    created_by = auth.uid()
    and (
      public.current_user_role() = 'va'
      or exists (select 1 from public.admins where user_id = auth.uid())
      or exists (select 1 from public.directors where user_id = auth.uid())
    )
  );

-- UPDATE: owner only
create policy "va_canva_links_update_owner"
  on public.va_canva_links for update
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

-- DELETE: owner only
create policy "va_canva_links_delete_owner"
  on public.va_canva_links for delete
  using (created_by = auth.uid());

-- updated_at trigger
create or replace function public.va_canva_links_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists va_canva_links_updated_at on public.va_canva_links;
create trigger va_canva_links_updated_at
  before update on public.va_canva_links
  for each row execute function public.va_canva_links_updated_at();
