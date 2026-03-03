-- VA can update member profile (for context learned in communication) and VA-only notes.

-- 1. VA may update member profiles only for members they have an assigned ticket with
create policy "profiles_va_update_assigned_member"
  on public.profiles for update
  using (
    role = 'member'
    and exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role = 'va')
    and exists (
      select 1 from public.tickets t
      where t.member_id = profiles.id
        and t.assigned_va_id = auth.uid()
    )
  )
  with check (
    role = 'member'
    and exists (
      select 1 from public.tickets t
      where t.member_id = profiles.id
        and t.assigned_va_id = auth.uid()
    )
  );

-- 2. VA-only notes about a member (only VAs can see; not visible to member or admins in member-facing UI)
create table if not exists public.va_member_notes (
  id uuid primary key default gen_random_uuid(),
  va_id uuid not null references auth.users(id) on delete cascade,
  member_id uuid not null references auth.users(id) on delete cascade,
  note_text text not null,
  created_at timestamptz not null default now()
);

comment on table public.va_member_notes is 'Notes VAs add about a member. Only VAs can read/write; used for context from communication.';

create index if not exists va_member_notes_member_va
  on public.va_member_notes (member_id, va_id, created_at desc);

alter table public.va_member_notes enable row level security;

-- VA can only see/edit notes for members they have an assigned ticket with
-- Select: VA sees their own notes for members they're assigned to
create policy "va_member_notes_va_select"
  on public.va_member_notes for select
  using (
    va_id = auth.uid()
    and exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role = 'va')
    and exists (
      select 1 from public.tickets t
      where t.member_id = va_member_notes.member_id
        and t.assigned_va_id = auth.uid()
    )
  );

-- Insert: VA can add notes only for members they're assigned to
create policy "va_member_notes_va_insert"
  on public.va_member_notes for insert
  with check (
    va_id = auth.uid()
    and exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role = 'va')
    and exists (
      select 1 from public.tickets t
      where t.member_id = va_member_notes.member_id
        and t.assigned_va_id = auth.uid()
    )
  );

-- Update/Delete: VA can only modify their own notes
create policy "va_member_notes_va_update"
  on public.va_member_notes for update
  using (va_id = auth.uid())
  with check (va_id = auth.uid());

create policy "va_member_notes_va_delete"
  on public.va_member_notes for delete
  using (va_id = auth.uid());
