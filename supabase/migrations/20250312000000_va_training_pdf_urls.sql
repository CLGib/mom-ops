-- Add optional PDF URLs to VA training sections (one URL per line, like image_urls).
alter table public.va_training_sections
  add column if not exists pdf_urls text;

comment on column public.va_training_sections.pdf_urls is 'Optional PDF document URLs for this section, one per line.';
