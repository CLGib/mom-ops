-- VA payment and contract info: where to get paid (PayPal or Wise), account details, legal name, contact, and contract dates.
-- effective_date and contract_start_date are set when the VA completes onboarding (agrees to terms).

alter table public.va_profiles
  add column if not exists payment_method text check (payment_method is null or payment_method in ('paypal', 'wise')),
  add column if not exists payment_account text,
  add column if not exists legal_name text,
  add column if not exists email_address text,
  add column if not exists effective_date date,
  add column if not exists contract_start_date date,
  add column if not exists address text,
  add column if not exists mobile_phone text;

comment on column public.va_profiles.payment_method is 'Where the VA chooses to get paid: paypal or wise.';
comment on column public.va_profiles.payment_account is 'PayPal email or Wise account identifier.';
comment on column public.va_profiles.legal_name is 'Legal name for contract and payments.';
comment on column public.va_profiles.email_address is 'Email for contract and payment correspondence.';
comment on column public.va_profiles.effective_date is 'Set when VA completes onboarding (agrees to terms).';
comment on column public.va_profiles.contract_start_date is 'Set when VA completes onboarding (agrees to terms).';
