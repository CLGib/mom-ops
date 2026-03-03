-- Member public identity for reviews feed (Venmo-style): display name, avatar, optional bio and handle.
-- display_name: shown in public feed (default from preferred_name/full_name in app).
-- avatar_url: optional profile image URL (Supabase Storage).
-- handle: optional unique handle e.g. @chrissy.

alter table public.profiles
  add column if not exists display_name text,
  add column if not exists avatar_url text,
  add column if not exists bio text,
  add column if not exists handle text unique;

comment on column public.profiles.display_name is 'Name shown in public reviews feed. If null, app uses preferred_name or full_name or Anonymous.';
comment on column public.profiles.avatar_url is 'Profile image URL for public feed (e.g. Supabase Storage).';
comment on column public.profiles.handle is 'Optional unique handle e.g. @chrissy for public profile.';
