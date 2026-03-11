-- Require all VAs (including current) to take the training quiz.
-- Resets training_complete so everyone must pass the quiz again to claim tasks.
-- Only update rows where user still has role 'va' (avoids trigger va_profiles_ensure_va_role failing on orphaned rows).
update public.va_profiles v
set training_complete = false,
    updated_at = now()
where exists (select 1 from public.user_roles ur where ur.user_id = v.user_id and ur.role = 'va');
