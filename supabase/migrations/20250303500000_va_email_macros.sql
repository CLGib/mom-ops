-- VA Email Macros: Zendesk-style reply snippets. VAs can read; admin/director manage.
-- Used in ticket reply composer (Insert macro) and as communication examples in onboarding.

create table if not exists public.va_email_macros (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  body text not null,
  category text,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.va_email_macros is 'Email reply macros for VAs. VAs can select; admin and director can create, update, delete.';

create index if not exists va_email_macros_created_at on public.va_email_macros (created_at desc);
create index if not exists va_email_macros_category on public.va_email_macros (category) where category is not null;

alter table public.va_email_macros enable row level security;

-- SELECT: va, admin, director
create policy "va_email_macros_select_va_admin_director"
  on public.va_email_macros for select
  using (
    public.current_user_role() = 'va'
    or exists (select 1 from public.admins where user_id = auth.uid())
    or exists (select 1 from public.directors where user_id = auth.uid())
  );

-- INSERT: admin, director only
create policy "va_email_macros_insert_admin_director"
  on public.va_email_macros for insert
  with check (
    created_by = auth.uid()
    and (
      exists (select 1 from public.admins where user_id = auth.uid())
      or exists (select 1 from public.directors where user_id = auth.uid())
    )
  );

-- UPDATE: admin, director only
create policy "va_email_macros_update_admin_director"
  on public.va_email_macros for update
  using (
    exists (select 1 from public.admins where user_id = auth.uid())
    or exists (select 1 from public.directors where user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.admins where user_id = auth.uid())
    or exists (select 1 from public.directors where user_id = auth.uid())
  );

-- DELETE: admin, director only
create policy "va_email_macros_delete_admin_director"
  on public.va_email_macros for delete
  using (
    exists (select 1 from public.admins where user_id = auth.uid())
    or exists (select 1 from public.directors where user_id = auth.uid())
  );

-- updated_at trigger
create or replace function public.va_email_macros_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists va_email_macros_updated_at on public.va_email_macros;
create trigger va_email_macros_updated_at
  before update on public.va_email_macros
  for each row execute function public.va_email_macros_updated_at();
