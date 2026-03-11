-- Backfill: mark all current members as founding members (badge + founder reactivate pricing)
UPDATE public.profiles
SET is_founding_member = true
WHERE role = 'member';
