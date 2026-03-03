-- Task library: catalog of task templates for Explore Tasks
-- Admin can add/delete. Used by members and VAs for reference.

create table if not exists public.task_library (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  task text not null,
  credits integer not null default 0,
  template text not null default '',
  rank integer not null default 500,
  created_at timestamptz not null default now()
);

create index if not exists task_library_rank_idx on public.task_library (rank);
create index if not exists task_library_category_idx on public.task_library (category);

-- RLS: anyone authenticated can read; only admin can insert/update/delete
alter table public.task_library enable row level security;

create policy "task_library_select_authenticated"
  on public.task_library for select
  to authenticated
  using (true);

create policy "task_library_admin_all"
  on public.task_library for all
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');
