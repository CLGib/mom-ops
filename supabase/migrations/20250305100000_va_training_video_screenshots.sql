-- Add video link and screenshot image URLs to VA training sections.
alter table public.va_training_sections
  add column if not exists video_url text,
  add column if not exists image_urls text;

comment on column public.va_training_sections.video_url is 'Optional link to a training video (e.g. YouTube, Loom).';
comment on column public.va_training_sections.image_urls is 'Optional screenshot URLs, one per line.';
