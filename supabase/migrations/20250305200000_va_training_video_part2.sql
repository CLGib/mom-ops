-- Add second video URL for Part 2 training videos.
alter table public.va_training_sections
  add column if not exists video_url_2 text;

comment on column public.va_training_sections.video_url_2 is 'Optional second video link (e.g. Part 2).';
