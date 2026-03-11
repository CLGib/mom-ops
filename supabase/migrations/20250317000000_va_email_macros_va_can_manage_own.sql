-- VAs can create their own email macros and edit/delete only macros they created.
-- Preset macros (created by admin/director) remain read-only for VAs.

-- INSERT: VAs may insert with created_by = auth.uid()
create policy "va_email_macros_insert_va"
  on public.va_email_macros for insert
  with check (
    public.current_user_role() = 'va'
    and created_by = auth.uid()
  );

-- UPDATE: VAs may update only rows they created
create policy "va_email_macros_update_va_own"
  on public.va_email_macros for update
  using (
    public.current_user_role() = 'va'
    and created_by = auth.uid()
  )
  with check (
    public.current_user_role() = 'va'
    and created_by = auth.uid()
  );

-- DELETE: VAs may delete only rows they created
create policy "va_email_macros_delete_va_own"
  on public.va_email_macros for delete
  using (
    public.current_user_role() = 'va'
    and created_by = auth.uid()
  );
