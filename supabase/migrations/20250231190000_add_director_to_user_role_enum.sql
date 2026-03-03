-- Add 'director' to user_role enum (e.g. if profiles.role uses enum user_role from Supabase).
-- Run this before 20250231200000_director_role_and_audit.sql so the enum accepts 'director'.
-- If your DB uses plain text + check for role (no enum), this may fail with "type does not exist"; you can skip or drop this migration.

alter type public.user_role add value if not exists 'director';
