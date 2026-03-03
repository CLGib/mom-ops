-- CFO role: financial visibility (revenue, costs, NPS, VA pay info). No admin/team controls.
-- Requires 20250232250000_add_cfo_to_user_role_enum.sql to have run first (enum value in separate transaction).

-- 1. Add 'cfo' to user_roles and profiles constraints
alter table public.user_roles drop constraint if exists user_roles_role_check;
alter table public.user_roles add constraint user_roles_role_check check (role in ('member', 'va', 'admin', 'director', 'cfo'));

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
alter table public.profiles add constraint profiles_role_check check (role in ('member', 'va', 'admin', 'director', 'cfo'));

-- 2. cfos table (like admins/directors)
create table if not exists public.cfos (
  user_id uuid primary key references auth.users(id) on delete cascade
);

alter table public.cfos enable row level security;

drop policy if exists "cfos_select_authenticated" on public.cfos;
create policy "cfos_select_authenticated" on public.cfos
  for select to authenticated using (true);

insert into public.cfos (user_id)
  select id from public.profiles where role = 'cfo'
  on conflict (user_id) do nothing;

create or replace function public.sync_cfos_from_profile()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role = 'cfo' then
    insert into public.cfos (user_id) values (new.id) on conflict (user_id) do nothing;
  else
    delete from public.cfos where user_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists sync_cfos_trigger on public.profiles;
create trigger sync_cfos_trigger
  after insert or update of role on public.profiles
  for each row execute function public.sync_cfos_from_profile();

-- 3. NPS: CFO can select
drop policy if exists "nps_responses_cfo_select" on public.nps_responses;
create policy "nps_responses_cfo_select" on public.nps_responses for select
  using (exists (select 1 from public.cfos where user_id = auth.uid()));

-- 4. Revenue costs: CFO can select and insert (upload expenses)
drop policy if exists "revenue_costs_cfo" on public.revenue_costs;
create policy "revenue_costs_cfo" on public.revenue_costs
  for select using (exists (select 1 from public.cfos where user_id = auth.uid()));
create policy "revenue_costs_cfo_insert" on public.revenue_costs
  for insert with check (exists (select 1 from public.cfos where user_id = auth.uid()));

-- 5. Revenue dashboard settings: CFO can select (read-only)
drop policy if exists "revenue_dashboard_settings_cfo_select" on public.revenue_dashboard_settings;
create policy "revenue_dashboard_settings_cfo_select" on public.revenue_dashboard_settings
  for select using (exists (select 1 from public.cfos where user_id = auth.uid()));

-- 6. VA profiles: already select (true) for members; CFO is authenticated so can read. No change needed.
-- 7. va_payments, va_adjustments: CFO read for pay info
drop policy if exists "va_payments_cfo_select" on public.va_payments;
create policy "va_payments_cfo_select" on public.va_payments for select
  using (exists (select 1 from public.cfos where user_id = auth.uid()));

drop policy if exists "va_adjustments_cfo_select" on public.va_adjustments;
create policy "va_adjustments_cfo_select" on public.va_adjustments for select
  using (exists (select 1 from public.cfos where user_id = auth.uid()));
