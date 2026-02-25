-- Add is_founding_member to profiles for Founding Member badge in portal
alter table public.profiles
  add column if not exists is_founding_member boolean not null default false;
