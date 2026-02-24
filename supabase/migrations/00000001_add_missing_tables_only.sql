-- Run this in Supabase SQL Editor. Creates only the tables that are missing (profiles already exists).

-- Add subscription_status to profiles if missing
alter table public.profiles
  add column if not exists subscription_status text check (subscription_status is null or subscription_status in ('active', 'canceled'));

-- Tickets
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

-- Ticket messages
create table if not exists public.ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  sender_id uuid not null references public.profiles(id),
  sender_role text,
  message text not null,
  created_at timestamptz default now()
);

-- Credit transactions
create table if not exists public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles(id) on delete cascade,
  ticket_id uuid references public.tickets(id),
  amount integer not null,
  type text not null check (type in ('purchase', 'admin_adjustment', 'task_charge')),
  created_at timestamptz default now()
);

-- Stripe webhook idempotency
create table if not exists public.stripe_webhook_events (
  event_id text primary key,
  processed_at timestamptz default now()
);

-- Enable RLS on new tables
alter table public.tickets enable row level security;
alter table public.ticket_messages enable row level security;
alter table public.credit_transactions enable row level security;

-- Function for balance (needed for member dashboard)
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

-- Policies so the app can read/write
drop policy if exists "credit_transactions_select_own" on public.credit_transactions;
drop policy if exists "credit_transactions_admin_insert" on public.credit_transactions;
drop policy if exists "credit_transactions_admin_select" on public.credit_transactions;
create policy "credit_transactions_select_own" on public.credit_transactions for select using (member_id = auth.uid());
create policy "credit_transactions_admin_insert" on public.credit_transactions for insert with check (public.current_user_role() = 'admin');
create policy "credit_transactions_admin_select" on public.credit_transactions for select using (public.current_user_role() = 'admin');

drop policy if exists "tickets_member_select_own" on public.tickets;
drop policy if exists "tickets_member_insert_own" on public.tickets;
drop policy if exists "tickets_admin_all" on public.tickets;
create policy "tickets_member_select_own" on public.tickets for select using (member_id = auth.uid());
create policy "tickets_member_insert_own" on public.tickets for insert with check (member_id = auth.uid());
create policy "tickets_admin_all" on public.tickets for all using (public.current_user_role() = 'admin');

drop policy if exists "ticket_messages_select_ticket_member" on public.ticket_messages;
drop policy if exists "ticket_messages_insert_member" on public.ticket_messages;
create policy "ticket_messages_select_ticket_member" on public.ticket_messages for select using (exists (select 1 from public.tickets t where t.id = ticket_id and t.member_id = auth.uid()));
create policy "ticket_messages_insert_member" on public.ticket_messages for insert with check (exists (select 1 from public.tickets t where t.id = ticket_id and t.member_id = auth.uid()));
