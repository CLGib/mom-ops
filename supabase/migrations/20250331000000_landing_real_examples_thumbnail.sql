-- Optional thumbnail for the example card (homepage /free). CEO can upload or set URL.
alter table public.landing_real_examples
  add column if not exists thumbnail_url text;

comment on column public.landing_real_examples.thumbnail_url is 'Optional image URL for the card thumbnail. If not set, first deliverable image or PDF placeholder is used.';
