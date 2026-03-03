-- Receipt image and optional month for revenue_costs (manual entry + image upload).

-- Optional month: allow null so "month (optional)" can be left blank
alter table public.revenue_costs
  drop constraint if exists revenue_costs_month_check;
alter table public.revenue_costs
  add constraint revenue_costs_month_check check (month is null or (month ~ '^\d{4}-\d{2}$'));
alter table public.revenue_costs
  alter column month drop not null;

-- Receipt/attachment image URL (stored in storage, URL in column)
alter table public.revenue_costs
  add column if not exists receipt_url text;

comment on column public.revenue_costs.receipt_url is 'Optional URL to receipt/attachment image in storage.';

-- Storage bucket for cost receipt images (admin/director/CFO upload only)
insert into storage.buckets (id, name, public)
values ('revenue-cost-receipts', 'revenue-cost-receipts', true)
on conflict (id) do nothing;

-- Only admins, directors, and CFOs can upload (service role or auth with RLS)
-- Allow insert for authenticated users that pass app check (we verify admin/director/cfo in API)
create policy "revenue_cost_receipts_upload"
on storage.objects for insert to authenticated
with check (bucket_id = 'revenue-cost-receipts');

create policy "revenue_cost_receipts_update"
on storage.objects for update to authenticated
using (bucket_id = 'revenue-cost-receipts');

-- Public read so receipt links work
create policy "revenue_cost_receipts_select"
on storage.objects for select to public
using (bucket_id = 'revenue-cost-receipts');
