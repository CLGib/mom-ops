-- CEO can set payment amount per VA. Preset is $0.20 per credit; CEO can adjust per VA.

alter table public.va_profiles
  add column if not exists payment_per_credit numeric(6,4) not null default 0.2
    check (payment_per_credit > 0 and payment_per_credit <= 100);

comment on column public.va_profiles.payment_per_credit is 'Dollars paid to this VA per member credit (e.g. 0.2 = $0.20/credit). CEO-editable; default 0.2.';
