-- VA onboarding: completion flag required before claiming first task
alter table public.va_profiles
  add column if not exists onboarding_complete boolean not null default false;

comment on column public.va_profiles.onboarding_complete is 'VA must complete onboarding (read guide + mark as read) before claiming tasks.';
