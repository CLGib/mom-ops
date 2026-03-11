-- VA Toolbox: searchable how-to video library (YouTube embeds, optional example ticket link).
-- VAs see read-only; admin/director can manage.

create table if not exists public.va_how_to_videos (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  youtube_url text not null,
  task_category text,
  example_ticket_id uuid references public.tickets(id) on delete set null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.va_how_to_videos is 'How-to videos for VA Toolbox: YouTube embeds with optional link to example ticket.';
comment on column public.va_how_to_videos.example_ticket_id is 'Optional ticket to show "See Ticket #N for full details" link.';

create index if not exists va_how_to_videos_sort_order on public.va_how_to_videos (sort_order asc);
create index if not exists va_how_to_videos_task_category on public.va_how_to_videos (task_category);

alter table public.va_how_to_videos enable row level security;

-- SELECT: va, admin, director
create policy "va_how_to_videos_select_va_admin_director"
  on public.va_how_to_videos for select
  using (
    public.current_user_role() = 'va'
    or exists (select 1 from public.admins where user_id = auth.uid())
    or exists (select 1 from public.directors where user_id = auth.uid())
  );

-- INSERT/UPDATE/DELETE: admin, director only
create policy "va_how_to_videos_insert_admin_director"
  on public.va_how_to_videos for insert
  with check (
    exists (select 1 from public.admins where user_id = auth.uid())
    or exists (select 1 from public.directors where user_id = auth.uid())
  );

create policy "va_how_to_videos_update_admin_director"
  on public.va_how_to_videos for update
  using (
    exists (select 1 from public.admins where user_id = auth.uid())
    or exists (select 1 from public.directors where user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.admins where user_id = auth.uid())
    or exists (select 1 from public.directors where user_id = auth.uid())
  );

create policy "va_how_to_videos_delete_admin_director"
  on public.va_how_to_videos for delete
  using (
    exists (select 1 from public.admins where user_id = auth.uid())
    or exists (select 1 from public.directors where user_id = auth.uid())
  );

create or replace function public.va_how_to_videos_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists va_how_to_videos_updated_at on public.va_how_to_videos;
create trigger va_how_to_videos_updated_at
  before update on public.va_how_to_videos
  for each row execute function public.va_how_to_videos_updated_at();
