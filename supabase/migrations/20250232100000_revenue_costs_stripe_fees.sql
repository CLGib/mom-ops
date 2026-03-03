-- Add stripe_fees to revenue_costs category enum (for manual entry and display).
alter table public.revenue_costs
  drop constraint if exists revenue_costs_category_check;

alter table public.revenue_costs
  add constraint revenue_costs_category_check check (category in (
    'va_cost', 'tips_payout', 'drins_pay', 'bonus', 'software', 'other', 'refund', 'stripe_fees'
  ));
