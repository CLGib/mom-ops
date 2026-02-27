-- Optional VA tips: one-time payment after task complete; 100% to assigned VA.
create table if not exists public.task_tips (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tickets(id) on delete cascade,
  va_id uuid not null references public.profiles(id) on delete cascade,
  member_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(10,2) not null,
  stripe_payment_intent_id text unique,
  created_at timestamptz default now()
);

create index if not exists task_tips_task_id on public.task_tips (task_id);
create index if not exists task_tips_va_id on public.task_tips (va_id);
create index if not exists task_tips_member_id on public.task_tips (member_id);

alter table public.task_tips enable row level security;

-- Members can select their own tip records; VAs can select tips for them; admin all
create policy "task_tips_member_select_own" on public.task_tips
  for select using (member_id = auth.uid());

create policy "task_tips_va_select_own" on public.task_tips
  for select using (va_id = auth.uid());

create policy "task_tips_admin_all" on public.task_tips
  for all using (public.current_user_role() = 'admin');

-- Service role / webhook will insert (no policy for insert from client; webhook uses service role)
comment on table public.task_tips is 'One-time tips from members to VAs after task completion; processed via Stripe.';
