-- Run this in Supabase Dashboard → SQL Editor if credit_transactions (or other tables) are missing.
-- Uses "if not exists" so it's safe to run even if some objects already exist.

-- 1. Profiles (id = auth.users.id)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('member', 'va', 'admin')),
  created_at timestamptz default now()
);

alter table public.profiles
  add column if not exists subscription_status text check (subscription_status is null or subscription_status in ('active', 'canceled'));

-- 2. Tickets
create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles(id) on delete cascade,
  assigned_va_id uuid references public.profiles(id),
  subject text not null,
  description text,
  status text not null check (status in ('new', 'assigned', 'awaiting_member_approval', 'in_progress', 'waiting_on_member', 'completed', 'closed')),
  credit_cost integer,
  tip_amount integer default 0,
  rating integer check (rating is null or (rating >= 1 and rating <= 5)),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  completed_at timestamptz
);

-- 3. Ticket messages
create table if not exists public.ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  sender_id uuid not null references public.profiles(id),
  sender_role text,
  message text not null,
  created_at timestamptz default now()
);

-- 4. Credit transactions (balance = sum(amount) per member)
create table if not exists public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles(id) on delete cascade,
  ticket_id uuid references public.tickets(id),
  amount integer not null,
  type text not null check (type in ('purchase', 'admin_adjustment', 'task_charge')),
  created_at timestamptz default now()
);

-- 5. Stripe webhook idempotency
create table if not exists public.stripe_webhook_events (
  event_id text primary key,
  processed_at timestamptz default now()
);

-- Triggers and functions (replace if exists)
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists tickets_updated_at on public.tickets;
create trigger tickets_updated_at
  before update on public.tickets
  for each row execute function public.set_updated_at();

create or replace function public.set_ticket_completed_at()
returns trigger as $$
begin
  if new.status = 'completed' and (old.status is null or old.status <> 'completed') then
    new.completed_at = now();
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists ticket_set_completed_at on public.tickets;
create trigger ticket_set_completed_at
  before update on public.tickets
  for each row execute function public.set_ticket_completed_at();

create or replace function public.on_ticket_completed()
returns trigger as $$
begin
  if new.status = 'completed' and (old.status is null or old.status <> 'completed') then
    if new.credit_cost is not null and new.credit_cost > 0 then
      insert into public.credit_transactions (member_id, ticket_id, amount, type)
      values (new.member_id, new.id, -new.credit_cost, 'task_charge');
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists ticket_completed_charge on public.tickets;
create trigger ticket_completed_charge
  after update on public.tickets
  for each row execute function public.on_ticket_completed();

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, role)
  values (new.id, 'member')
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS
alter table public.profiles enable row level security;
alter table public.tickets enable row level security;
alter table public.ticket_messages enable row level security;
alter table public.credit_transactions enable row level security;

-- Helper and get_member_balance
create or replace function public.current_user_role()
returns text as $$
  select role from public.profiles where id = auth.uid();
$$ language sql security definer stable;

create or replace function public.get_member_balance(p_member_id uuid)
returns integer as $$
begin
  if auth.uid() <> p_member_id and public.current_user_role() <> 'admin' then
    return null;
  end if;
  return (select coalesce(sum(amount), 0)::integer from public.credit_transactions where member_id = p_member_id);
end;
$$ language plpgsql security definer stable;

-- Policies (drop first if re-running to avoid duplicate policy errors)
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_admin_all" on public.profiles;
create policy "profiles_select_own" on public.profiles for select using (id = auth.uid());
create policy "profiles_update_own" on public.profiles for update using (id = auth.uid());
create policy "profiles_admin_all" on public.profiles for all using (public.current_user_role() = 'admin');

drop policy if exists "tickets_member_select_own" on public.tickets;
drop policy if exists "tickets_member_insert_own" on public.tickets;
drop policy if exists "tickets_va_select_assigned" on public.tickets;
drop policy if exists "tickets_va_select_new" on public.tickets;
drop policy if exists "tickets_va_update_assigned_or_claim" on public.tickets;
drop policy if exists "tickets_admin_all" on public.tickets;
create policy "tickets_member_select_own" on public.tickets for select using (member_id = auth.uid());
create policy "tickets_member_insert_own" on public.tickets for insert with check (member_id = auth.uid());
create policy "tickets_va_select_assigned" on public.tickets for select using (assigned_va_id = auth.uid());
create policy "tickets_va_select_new" on public.tickets for select using (status = 'new' and assigned_va_id is null and public.current_user_role() = 'va');
create policy "tickets_va_update_assigned_or_claim" on public.tickets for update using (assigned_va_id = auth.uid() or (assigned_va_id is null and public.current_user_role() = 'va')) with check (assigned_va_id = auth.uid() or public.current_user_role() = 'admin');
create policy "tickets_admin_all" on public.tickets for all using (public.current_user_role() = 'admin');

drop policy if exists "ticket_messages_select_ticket_member" on public.ticket_messages;
drop policy if exists "ticket_messages_select_ticket_va" on public.ticket_messages;
drop policy if exists "ticket_messages_select_admin" on public.ticket_messages;
drop policy if exists "ticket_messages_insert_member" on public.ticket_messages;
drop policy if exists "ticket_messages_insert_va" on public.ticket_messages;
drop policy if exists "ticket_messages_insert_admin" on public.ticket_messages;
create policy "ticket_messages_select_ticket_member" on public.ticket_messages for select using (exists (select 1 from public.tickets t where t.id = ticket_id and t.member_id = auth.uid()));
create policy "ticket_messages_select_ticket_va" on public.ticket_messages for select using (exists (select 1 from public.tickets t where t.id = ticket_id and t.assigned_va_id = auth.uid()));
create policy "ticket_messages_select_admin" on public.ticket_messages for select using (public.current_user_role() = 'admin');
create policy "ticket_messages_insert_member" on public.ticket_messages for insert with check (exists (select 1 from public.tickets t where t.id = ticket_id and t.member_id = auth.uid()));
create policy "ticket_messages_insert_va" on public.ticket_messages for insert with check (exists (select 1 from public.tickets t where t.id = ticket_id and t.assigned_va_id = auth.uid()));
create policy "ticket_messages_insert_admin" on public.ticket_messages for insert with check (public.current_user_role() = 'admin');

drop policy if exists "credit_transactions_select_own" on public.credit_transactions;
drop policy if exists "credit_transactions_admin_insert" on public.credit_transactions;
drop policy if exists "credit_transactions_admin_select" on public.credit_transactions;
create policy "credit_transactions_select_own" on public.credit_transactions for select using (member_id = auth.uid());
create policy "credit_transactions_admin_insert" on public.credit_transactions for insert with check (public.current_user_role() = 'admin');
create policy "credit_transactions_admin_select" on public.credit_transactions for select using (public.current_user_role() = 'admin');
