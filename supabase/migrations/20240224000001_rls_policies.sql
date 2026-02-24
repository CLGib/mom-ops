-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.tickets enable row level security;
alter table public.ticket_messages enable row level security;
alter table public.credit_transactions enable row level security;

-- Helper: get current user's role from profiles
create or replace function public.current_user_role()
returns text as $$
  select role from public.profiles where id = auth.uid();
$$ language sql security definer stable;

-- profiles: users can read/update own; admin can do all
create policy "profiles_select_own" on public.profiles
  for select using (id = auth.uid());

create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid());

create policy "profiles_admin_all" on public.profiles
  for all using (public.current_user_role() = 'admin');

-- tickets: member view/insert own; VA view/update assigned; admin all
create policy "tickets_member_select_own" on public.tickets
  for select using (member_id = auth.uid());

create policy "tickets_member_insert_own" on public.tickets
  for insert with check (member_id = auth.uid());

create policy "tickets_va_select_assigned" on public.tickets
  for select using (assigned_va_id = auth.uid());

create policy "tickets_va_select_new" on public.tickets
  for select using (
    status = 'new' and assigned_va_id is null and public.current_user_role() = 'va'
  );

create policy "tickets_va_update_assigned_or_claim" on public.tickets
  for update using (
    assigned_va_id = auth.uid()
    or (assigned_va_id is null and public.current_user_role() = 'va')
  )
  with check (assigned_va_id = auth.uid() or public.current_user_role() = 'admin');

create policy "tickets_admin_all" on public.tickets
  for all using (public.current_user_role() = 'admin');

-- ticket_messages: member insert for own tickets; VA insert for assigned; all can select messages for tickets they can see
create policy "ticket_messages_select_ticket_member" on public.ticket_messages
  for select using (
    exists (select 1 from public.tickets t where t.id = ticket_id and t.member_id = auth.uid())
  );

create policy "ticket_messages_select_ticket_va" on public.ticket_messages
  for select using (
    exists (select 1 from public.tickets t where t.id = ticket_id and t.assigned_va_id = auth.uid())
  );

create policy "ticket_messages_select_admin" on public.ticket_messages
  for select using (public.current_user_role() = 'admin');

create policy "ticket_messages_insert_member" on public.ticket_messages
  for insert with check (
    exists (select 1 from public.tickets t where t.id = ticket_id and t.member_id = auth.uid())
  );

create policy "ticket_messages_insert_va" on public.ticket_messages
  for insert with check (
    exists (select 1 from public.tickets t where t.id = ticket_id and t.assigned_va_id = auth.uid())
  );

create policy "ticket_messages_insert_admin" on public.ticket_messages
  for insert with check (public.current_user_role() = 'admin');

-- credit_transactions: member can select own (for balance); admin can insert
create policy "credit_transactions_select_own" on public.credit_transactions
  for select using (member_id = auth.uid());

create policy "credit_transactions_admin_insert" on public.credit_transactions
  for insert with check (public.current_user_role() = 'admin');

create policy "credit_transactions_admin_select" on public.credit_transactions
  for select using (public.current_user_role() = 'admin');

-- RPC: get balance for a member (caller must be that member or admin)
create or replace function public.get_member_balance(p_member_id uuid)
returns integer as $$
begin
  if auth.uid() <> p_member_id and public.current_user_role() <> 'admin' then
    return null;
  end if;
  return (select coalesce(sum(amount), 0)::integer from public.credit_transactions where member_id = p_member_id);
end;
$$ language plpgsql security definer stable;
