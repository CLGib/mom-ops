-- Members may only delete their own attachments (task-level or messages they sent).
-- VAs may delete any attachment on tickets they're assigned to.

drop policy if exists "ticket_attachments_delete_member_or_va" on public.ticket_attachments;

-- VA: can delete any attachment on tickets they're assigned to
create policy "ticket_attachments_delete_va" on public.ticket_attachments
  for delete using (
    exists (
      select 1 from public.tickets t
      where t.id = ticket_attachments.ticket_id
      and t.assigned_va_id = auth.uid()
    )
  );

-- Member: can delete only attachments they "own": task-level (no message_id) or attached to a message they sent
create policy "ticket_attachments_delete_member_own" on public.ticket_attachments
  for delete using (
    exists (
      select 1 from public.tickets t
      where t.id = ticket_attachments.ticket_id
      and t.member_id = auth.uid()
      and (
        ticket_attachments.message_id is null
        or exists (
          select 1 from public.ticket_messages m
          where m.id = ticket_attachments.message_id
          and m.sender_id = auth.uid()
        )
      )
    )
  );

-- Storage delete: allow only when the corresponding ticket_attachment row would be deletable by this user.
-- (Prevents member from deleting the file in storage for a VA-added attachment.)
create or replace function public.storage_task_attachments_delete_allowed(p_path text, p_bucket text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ticket_id text;
  v_user_id uuid;
  v_attachment record;
begin
  if p_bucket <> 'task-attachments' then
    return false;
  end if;
  v_user_id := auth.uid();
  if v_user_id is null then
    return false;
  end if;
  v_ticket_id := split_part(p_path, '/', 1);
  if v_ticket_id is null or v_ticket_id = '' then
    return false;
  end if;
  -- Find the attachment row for this path
  select ta.id, ta.message_id into v_attachment
  from public.ticket_attachments ta
  where ta.file_path = p_path
  and ta.ticket_id::text = v_ticket_id
  limit 1;
  if not found then
    return false;
  end if;
  -- VA of this ticket can always delete
  if exists (
    select 1 from public.tickets t
    where t.id::text = v_ticket_id
    and t.assigned_va_id = v_user_id
  ) then
    return true;
  end if;
  -- Member can delete only their own: task-level or message they sent
  return exists (
    select 1 from public.tickets t
    where t.id::text = v_ticket_id
    and t.member_id = v_user_id
    and (
      v_attachment.message_id is null
      or exists (
        select 1 from public.ticket_messages m
        where m.id = v_attachment.message_id
        and m.sender_id = v_user_id
      )
    )
  );
end;
$$;

drop policy if exists "task_attachments_delete" on storage.objects;
create policy "task_attachments_delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'task-attachments'
  and public.storage_task_attachments_delete_allowed(name, bucket_id)
);
