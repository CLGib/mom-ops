-- Allow members to delete their own task reviews.
create policy "task_reviews_delete_own" on public.task_reviews
  for delete using (member_id = auth.uid());
