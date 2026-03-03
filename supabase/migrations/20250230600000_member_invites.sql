-- Member invites: admin invites someone by email with a seeded credit amount.
-- When the invited user is created (they accept the invite), we grant those credits.
-- Only one pending invite per email; no subscription required—they use credits until they run out.

create table if not exists public.member_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  credits_to_seed integer not null check (credits_to_seed > 0),
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  redeemed_at timestamptz
);

comment on table public.member_invites is 'Pending member invites from admin. When the user signs up (accepts invite), credits are granted and redeemed_at is set.';

-- One pending invite per email
create unique index member_invites_pending_email_unique
  on public.member_invites (lower(email)) where redeemed_at is null;

alter table public.member_invites enable row level security;

-- Only admins can manage invites
create policy "member_invites_admin_all" on public.member_invites
  for all using (exists (select 1 from public.admins where user_id = auth.uid()));

-- Redeem a pending invite for the current user. Call from app when member first loads (e.g. layout/page).
-- Grants seeded credits and marks invite redeemed. Idempotent: no-op if already redeemed.
create or replace function public.redeem_member_invite()
returns void language plpgsql security definer set search_path = public as $$
declare
  v_email text;
  v_credits integer;
  v_invite_id uuid;
begin
  select email into v_email from auth.users where id = auth.uid() limit 1;
  if v_email is null then
    return;
  end if;

  select id, credits_to_seed into v_invite_id, v_credits
  from public.member_invites
  where lower(email) = lower(v_email)
    and redeemed_at is null
  limit 1
  for update skip locked;

  if v_invite_id is not null and v_credits is not null and v_credits > 0 then
    insert into public.credit_transactions (member_id, amount, type)
    values (auth.uid(), v_credits, 'admin_adjustment');
    update public.member_invites
    set redeemed_at = now()
    where id = v_invite_id;
  end if;
end;
$$;

grant execute on function public.redeem_member_invite() to authenticated;
