-- Fix VA storage upload: RLS on storage.objects runs in a context where the subquery
-- against tickets may not see the row. Use a SECURITY DEFINER function so the check
-- bypasses RLS on tickets and explicitly allows member or assigned VA.

create or replace function public.storage_task_attachments_upload_allowed(p_path text, p_bucket text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ticket_id text;
  v_user_id uuid;
begin
  if p_bucket <> 'task-attachments' then
    return false;
  end if;
  v_user_id := auth.uid();
  if v_user_id is null then
    return false;
  end if;
  -- First path segment is ticket id (e.g. "uuid/msg_xxx.jpg" -> "uuid")
  v_ticket_id := split_part(p_path, '/', 1);
  if v_ticket_id is null or v_ticket_id = '' then
    return false;
  end if;
  return exists (
    select 1 from public.tickets t
    where t.id::text = v_ticket_id
    and (t.member_id = v_user_id or t.assigned_va_id = v_user_id)
  );
end;
$$;

-- Replace the single upload policy with one that uses the function (name = path in storage.objects)
drop policy if exists "task_attachments_upload" on storage.objects;
create policy "task_attachments_upload"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'task-attachments'
  and public.storage_task_attachments_upload_allowed(name, bucket_id)
);
