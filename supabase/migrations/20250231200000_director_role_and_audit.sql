-- Director of Experience & Operations: new role with operational visibility, restricted financial controls.
-- Adds director role, directors table, va_invites (for activation bonus), audit_log.

-- 1. Allow 'director' in user_roles and profiles
alter table public.user_roles drop constraint if exists user_roles_role_check;
alter table public.user_roles add constraint user_roles_role_check check (role in ('member', 'va', 'admin', 'director'));

do $$
declare
  cname text;
begin
  for cname in
    select t.constraint_name
    from information_schema.table_constraints t
    join information_schema.constraint_column_usage c on c.constraint_name = t.constraint_name and c.table_schema = t.table_schema
    where t.table_schema = 'public' and t.table_name = 'profiles' and t.constraint_type = 'CHECK' and c.column_name = 'role'
  loop
    execute format('alter table public.profiles drop constraint if exists %I', cname);
  end loop;
end $$;
alter table public.profiles add constraint profiles_role_check check (role in ('member', 'va', 'admin', 'director'));

-- 2. Directors table (like admins) for RLS
create table if not exists public.directors (
  user_id uuid primary key references auth.users(id) on delete cascade
);

alter table public.directors enable row level security;

drop policy if exists "directors_select_authenticated" on public.directors;
create policy "directors_select_authenticated" on public.directors
  for select to authenticated using (true);

-- Backfill from profiles (run once)
insert into public.directors (user_id)
  select id from public.profiles where role = 'director'
  on conflict (user_id) do nothing;

-- Sync directors when profile role changes
create or replace function public.sync_directors_from_profile()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role = 'director' then
    insert into public.directors (user_id) values (new.id) on conflict (user_id) do nothing;
  else
    delete from public.directors where user_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists sync_directors_trigger on public.profiles;
create trigger sync_directors_trigger
  after insert or update of role on public.profiles
  for each row execute function public.sync_directors_from_profile();

-- 3. VA invites: track who invited each VA (for activation bonus: only Director-invited VAs qualify)
create table if not exists public.va_invites (
  id uuid primary key default gen_random_uuid(),
  invited_by uuid not null references auth.users(id) on delete set null,
  va_id uuid not null references auth.users(id) on delete cascade,
  invited_at timestamptz not null default now(),
  constraint va_invites_va_unique unique (va_id)
);

comment on table public.va_invites is 'Tracks which admin/director invited each VA. Used for activation bonus (only Director-invited VAs qualify).';

alter table public.va_invites enable row level security;

create policy "va_invites_admin_all" on public.va_invites for all using (exists (select 1 from public.admins where user_id = auth.uid()));
create policy "va_invites_director_select" on public.va_invites for select using (exists (select 1 from public.directors where user_id = auth.uid()));
create policy "va_invites_director_insert" on public.va_invites for insert with check (exists (select 1 from public.directors where user_id = auth.uid()) and invited_by = auth.uid());

-- 4. Audit log for Director (and Admin) actions
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete set null,
  action_type text not null,
  affected_entity_type text,
  affected_entity_id uuid,
  details jsonb,
  created_at timestamptz not null default now()
);

comment on table public.audit_log is 'Logs admin/director actions: VA invites, suspensions, credit issuance, task flags, payroll status.';

create index if not exists audit_log_created_at on public.audit_log (created_at desc);
create index if not exists audit_log_action_type on public.audit_log (action_type);

alter table public.audit_log enable row level security;

create policy "audit_log_admin_all" on public.audit_log for all using (exists (select 1 from public.admins where user_id = auth.uid()));
create policy "audit_log_director_select" on public.audit_log for select using (exists (select 1 from public.directors where user_id = auth.uid()));
create policy "audit_log_director_insert" on public.audit_log for insert with check (exists (select 1 from public.directors where user_id = auth.uid()) and user_id = auth.uid());

-- 5. Director read access: allow director to SELECT on key tables (same visibility as admin for read)
-- Tickets
drop policy if exists "tickets_director_select" on public.tickets;
create policy "tickets_director_select" on public.tickets for select using (exists (select 1 from public.directors where user_id = auth.uid()));

-- Profiles (for VAs and members list)
drop policy if exists "profiles_director_select" on public.profiles;
create policy "profiles_director_select" on public.profiles for select using (exists (select 1 from public.directors where user_id = auth.uid()));

-- Task reviews
drop policy if exists "task_reviews_director_select" on public.task_reviews;
create policy "task_reviews_director_select" on public.task_reviews for select using (exists (select 1 from public.directors where user_id = auth.uid()));

-- Credit transactions (read-only for Director)
drop policy if exists "credit_transactions_director_select" on public.credit_transactions;
create policy "credit_transactions_director_select" on public.credit_transactions for select using (exists (select 1 from public.directors where user_id = auth.uid()));

-- user_roles: director can see own and (for nav) we need director to see roles for listing VAs/members
drop policy if exists "user_roles_director_select" on public.user_roles;
create policy "user_roles_director_select" on public.user_roles for select using (exists (select 1 from public.directors where user_id = auth.uid()));
