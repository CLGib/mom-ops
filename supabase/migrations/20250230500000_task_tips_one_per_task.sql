-- Enforce at most one tip per task.
create unique index if not exists task_tips_task_id_unique on public.task_tips (task_id);
