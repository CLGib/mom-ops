-- profiles (id = auth.users.id)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('member', 'va', 'admin')),
  created_at timestamptz default now()
);

-- tickets
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

-- ticket_messages
create table if not exists public.ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  sender_id uuid not null references public.profiles(id),
  sender_role text,
  message text not null,
  created_at timestamptz default now()
);

-- credit_transactions (balance = sum(amount) per member)
create table if not exists public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles(id) on delete cascade,
  ticket_id uuid references public.tickets(id),
  amount integer not null,
  type text not null check (type in ('purchase', 'admin_adjustment', 'task_charge')),
  created_at timestamptz default now()
);

-- updated_at trigger for tickets
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

-- Set completed_at when status becomes 'completed'
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

-- When ticket status changes to 'completed', charge member (insert credit_transaction)
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

-- Auto-create profile on signup (default role 'member')
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, role)
  values (new.id, 'member');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
