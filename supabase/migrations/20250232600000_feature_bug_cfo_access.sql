-- Allow CFO to access Feature & Bug Log (view and manage cards/notes).
-- Also allow requestor_role 'cfo' when submitting feedback.

-- 1. Allow CFO in requestor_role check (for submissions from CFO)
alter table public.feature_bug_cards
  drop constraint if exists feature_bug_cards_requestor_role_check;
alter table public.feature_bug_cards
  add constraint feature_bug_cards_requestor_role_check
  check (requestor_role in ('member', 'va', 'admin', 'director', 'cfo'));

-- 2. CFO can select/update/delete all feature_bug_cards (same as admin/director)
create policy "feature_bug_cards_cfo_all"
  on public.feature_bug_cards for all
  using (exists (select 1 from public.cfos where user_id = auth.uid()))
  with check (exists (select 1 from public.cfos where user_id = auth.uid()));

-- 3. CFO can manage feature_bug_notes
create policy "feature_bug_notes_cfo_all"
  on public.feature_bug_notes for all
  using (exists (select 1 from public.cfos where user_id = auth.uid()))
  with check (exists (select 1 from public.cfos where user_id = auth.uid()));
