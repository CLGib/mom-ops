-- Add 'cfo' to user_role enum. Must run in its own migration and commit before using 'cfo'
-- (PostgreSQL 55P04: new enum value cannot be used in the same transaction).
do $$
begin
  alter type public.user_role add value 'cfo';
exception
  when duplicate_object then null;      -- enum label already exists
  when unique_violation then null;     -- pg_enum unique (typid, label)
  when undefined_object then null;     -- type user_role does not exist (profiles use text+check)
end $$;
