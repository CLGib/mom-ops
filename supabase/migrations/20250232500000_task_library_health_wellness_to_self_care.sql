-- Rename category "Health & Wellness Admin" to "Self Care" in task library
update public.task_library
set category = 'Self Care'
where category = 'Health & Wellness Admin';
