-- VA Toolbox: internal prompt cards for VA, CXO (director), CEO (admin).
-- Cards have title, prompt (copy-pastable), suggested_ai (e.g. Claude, Gemini), optional how_to_use.
-- Only owner (created_by) can edit/delete; all three roles can view and create.

create table if not exists public.va_toolbox_cards (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  prompt text not null,
  suggested_ai text,
  how_to_use text,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.va_toolbox_cards is 'Internal prompt cards for VA Toolbox. VA, admin (CEO), director (CXO) can view and create; only owner can edit/delete.';

create index if not exists va_toolbox_cards_created_at on public.va_toolbox_cards (created_at desc);
create index if not exists va_toolbox_cards_created_by on public.va_toolbox_cards (created_by);

alter table public.va_toolbox_cards enable row level security;

-- SELECT: va, admin, director
create policy "va_toolbox_cards_select_va_admin_director"
  on public.va_toolbox_cards for select
  using (
    public.current_user_role() = 'va'
    or exists (select 1 from public.admins where user_id = auth.uid())
    or exists (select 1 from public.directors where user_id = auth.uid())
  );

-- INSERT: va, admin, director; must set created_by = self
create policy "va_toolbox_cards_insert_va_admin_director"
  on public.va_toolbox_cards for insert
  with check (
    created_by = auth.uid()
    and (
      public.current_user_role() = 'va'
      or exists (select 1 from public.admins where user_id = auth.uid())
      or exists (select 1 from public.directors where user_id = auth.uid())
    )
  );

-- UPDATE: owner only
create policy "va_toolbox_cards_update_owner"
  on public.va_toolbox_cards for update
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

-- DELETE: owner only
create policy "va_toolbox_cards_delete_owner"
  on public.va_toolbox_cards for delete
  using (created_by = auth.uid());

-- updated_at trigger
create or replace function public.va_toolbox_cards_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists va_toolbox_cards_updated_at on public.va_toolbox_cards;
create trigger va_toolbox_cards_updated_at
  before update on public.va_toolbox_cards
  for each row execute function public.va_toolbox_cards_updated_at();
