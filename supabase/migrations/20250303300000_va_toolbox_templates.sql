-- VA Toolbox Templates: file uploads (Google Sheets export, DOCX, etc.) with title, description, author (created_by).
-- VA, admin, director can view and create; only owner can edit/delete.

create table if not exists public.va_toolbox_templates (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  file_path text not null,
  file_name text not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.va_toolbox_templates is 'VA Toolbox templates: uploaded files (DOCX, sheets export, etc.) with title, description. VA, admin, director can view and create; only owner can edit/delete.';

create index if not exists va_toolbox_templates_created_at on public.va_toolbox_templates (created_at desc);
create index if not exists va_toolbox_templates_created_by on public.va_toolbox_templates (created_by);

alter table public.va_toolbox_templates enable row level security;

create policy "va_toolbox_templates_select_va_admin_director"
  on public.va_toolbox_templates for select
  using (
    public.current_user_role() = 'va'
    or exists (select 1 from public.admins where user_id = auth.uid())
    or exists (select 1 from public.directors where user_id = auth.uid())
  );

create policy "va_toolbox_templates_insert_va_admin_director"
  on public.va_toolbox_templates for insert
  with check (
    created_by = auth.uid()
    and (
      public.current_user_role() = 'va'
      or exists (select 1 from public.admins where user_id = auth.uid())
      or exists (select 1 from public.directors where user_id = auth.uid())
    )
  );

create policy "va_toolbox_templates_update_owner"
  on public.va_toolbox_templates for update
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

create policy "va_toolbox_templates_delete_owner"
  on public.va_toolbox_templates for delete
  using (created_by = auth.uid());

create or replace function public.va_toolbox_templates_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists va_toolbox_templates_updated_at on public.va_toolbox_templates;
create trigger va_toolbox_templates_updated_at
  before update on public.va_toolbox_templates
  for each row execute function public.va_toolbox_templates_updated_at();

-- Storage bucket for VA Toolbox template files (DOCX, XLSX, PDF, etc.)
insert into storage.buckets (id, name, public)
values ('va-toolbox-templates', 'va-toolbox-templates', false)
on conflict (id) do nothing;

-- Upload: va, admin, director; path = {user_id}/{template_id}_{timestamp}_{random}.ext
create policy "va_toolbox_templates_storage_upload"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'va-toolbox-templates'
  and (
    public.current_user_role() = 'va'
    or exists (select 1 from public.admins where user_id = auth.uid())
    or exists (select 1 from public.directors where user_id = auth.uid())
  )
  and split_part(name, '/', 1) = auth.uid()::text
);

-- Update/delete: only owner (first path segment = user_id)
create policy "va_toolbox_templates_storage_update"
on storage.objects for update to authenticated
using (
  bucket_id = 'va-toolbox-templates'
  and split_part(name, '/', 1) = auth.uid()::text
);

create policy "va_toolbox_templates_storage_delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'va-toolbox-templates'
  and split_part(name, '/', 1) = auth.uid()::text
);

-- Select: va, admin, director (read any template file for download)
create policy "va_toolbox_templates_storage_select"
on storage.objects for select to authenticated
using (
  bucket_id = 'va-toolbox-templates'
  and (
    public.current_user_role() = 'va'
    or exists (select 1 from public.admins where user_id = auth.uid())
    or exists (select 1 from public.directors where user_id = auth.uid())
  )
);
