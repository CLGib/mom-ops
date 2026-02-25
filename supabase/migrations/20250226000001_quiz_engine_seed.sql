-- Seed one quiz: Mom Style Quiz — 7 questions, 4 outcomes, profile_writes for merge

-- Quiz (fixed id for deterministic references)
insert into public.quizzes (id, slug, title, description)
values (
  'a1000000-0000-4000-8000-000000000001',
  'mom-style-quiz',
  'What''s Your Mom Ops Style?',
  'Discover how you run your household in 2 minutes. Results help your VA personalize support.'
)
on conflict (slug) do nothing;

-- Outcomes (quiz_id = same fixed id)
insert into public.quiz_outcomes (quiz_id, outcome_slug, title, description, sort_order)
values
  ('a1000000-0000-4000-8000-000000000001', 'survival_mode_warrior', 'The Survival Mode Warrior', 'You keep the ship afloat day to day. Last-minute surprises are the norm, and you''re used to juggling. Your VA can help create buffers and simple systems so you can catch your breath.', 1),
  ('a1000000-0000-4000-8000-000000000001', 'the_system_builder', 'The System Builder', 'You love a good checklist and a clear process. You''re always refining how things run. Your VA can own recurring tasks and keep your systems running so you can focus on the next improvement.', 2),
  ('a1000000-0000-4000-8000-000000000001', 'the_calendar_commander', 'The Calendar Commander', 'If it''s not on the calendar, it doesn''t exist. You thrive when everyone knows what''s next. Your VA can manage scheduling, reminders, and coordination so nothing falls through the cracks.', 3),
  ('a1000000-0000-4000-8000-000000000001', 'the_cozy_connector', 'The Cozy Connector', 'Home is your haven and connection matters most. You care about how things feel, not just that they get done. Your VA can handle the logistics so you have more time for people and the moments that matter.', 4)
on conflict (quiz_id, outcome_slug) do nothing;

-- Question IDs (fixed for options FK)
-- q1..q7
insert into public.quiz_questions (id, quiz_id, sort_order, question_text, question_type)
values
  ('b1000001-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 1, 'When something unexpected hits your week, you usually:', 'single_choice'),
  ('b1000001-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000001', 2, 'Your ideal Sunday morning looks like:', 'single_choice'),
  ('b1000001-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000001', 3, 'Which best describes your kitchen or command center?', 'single_choice'),
  ('b1000001-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000001', 4, 'When you think about delegating, what feels hardest?', 'single_choice'),
  ('b1000001-0000-4000-8000-000000000005', 'a1000000-0000-4000-8000-000000000001', 5, 'Pick the phrase that sounds most like you:', 'multi_choice'),
  ('b1000001-0000-4000-8000-000000000006', 'a1000000-0000-4000-8000-000000000001', 6, 'How do you prefer to get things done?', 'single_choice'),
  ('b1000001-0000-4000-8000-000000000007', 'a1000000-0000-4000-8000-000000000001', 7, 'What would make the biggest difference for you right now?', 'single_choice')
on conflict (id) do nothing;

-- Options: each maps to outcome_slug + points; some have profile_writes
-- Q1
insert into public.quiz_options (question_id, sort_order, option_text, outcome_slug, points, profile_writes) values
  ('b1000001-0000-4000-8000-000000000001', 1, 'Roll with it and figure it out as I go', 'survival_mode_warrior', 2, '{"stress_triggers": ["last-minute surprises"]}'::jsonb),
  ('b1000001-0000-4000-8000-000000000001', 2, 'Check my system and adjust the plan', 'the_system_builder', 2, null),
  ('b1000001-0000-4000-8000-000000000001', 3, 'Move other things on the calendar to make room', 'the_calendar_commander', 2, null),
  ('b1000001-0000-4000-8000-000000000001', 4, 'Feel thrown off and need to reset before I can focus', 'the_cozy_connector', 2, '{"stress_triggers": ["schedule disruption"]}'::jsonb);
-- Q2
insert into public.quiz_options (question_id, sort_order, option_text, outcome_slug, points, profile_writes) values
  ('b1000001-0000-4000-8000-000000000002', 1, 'Catch up on sleep and low-key family time', 'survival_mode_warrior', 2, null),
  ('b1000001-0000-4000-8000-000000000002', 2, 'Review the week ahead and prep what I can', 'the_system_builder', 2, '{"recurring_events": ["weekly planning"]}'::jsonb),
  ('b1000001-0000-4000-8000-000000000002', 3, 'Sync calendars with everyone and confirm schedules', 'the_calendar_commander', 2, null),
  ('b1000001-0000-4000-8000-000000000002', 4, 'Something cozy—coffee, couch, maybe a slow start', 'the_cozy_connector', 2, '{"home_aesthetic": "cozy"}'::jsonb);
-- Q3
insert into public.quiz_options (question_id, sort_order, option_text, outcome_slug, points, profile_writes) values
  ('b1000001-0000-4000-8000-000000000003', 1, 'Functional chaos—I know where things are', 'survival_mode_warrior', 2, null),
  ('b1000001-0000-4000-8000-000000000003', 2, 'Organized: lists, bins, and a place for everything', 'the_system_builder', 2, '{"household": ["organized systems"]}'::jsonb),
  ('b1000001-0000-4000-8000-000000000003', 3, 'Calendar and family board front and center', 'the_calendar_commander', 2, null),
  ('b1000001-0000-4000-8000-000000000003', 4, 'Warm and lived-in; comfort over perfect order', 'the_cozy_connector', 2, '{"home_aesthetic": "warm"}'::jsonb);
-- Q4
insert into public.quiz_options (question_id, sort_order, option_text, outcome_slug, points, profile_writes) values
  ('b1000001-0000-4000-8000-000000000004', 1, 'Finding the time to explain what I need', 'survival_mode_warrior', 2, null),
  ('b1000001-0000-4000-8000-000000000004', 2, 'Letting go of control so someone else can own it', 'the_system_builder', 2, null),
  ('b1000001-0000-4000-8000-000000000004', 3, 'Keeping everyone on the same page', 'the_calendar_commander', 2, '{"community_roles": ["family coordinator"]}'::jsonb),
  ('b1000001-0000-4000-8000-000000000004', 4, 'Trusting that it''ll feel right, not just get done', 'the_cozy_connector', 2, null);
-- Q5 (multi_choice — each option adds points)
insert into public.quiz_options (question_id, sort_order, option_text, outcome_slug, points, profile_writes) values
  ('b1000001-0000-4000-8000-000000000005', 1, 'I''m the default for everything', 'survival_mode_warrior', 1, null),
  ('b1000001-0000-4000-8000-000000000005', 2, 'I love a good template or checklist', 'the_system_builder', 1, null),
  ('b1000001-0000-4000-8000-000000000005', 3, 'I need to see the full picture before I can relax', 'the_calendar_commander', 1, null),
  ('b1000001-0000-4000-8000-000000000005', 4, 'Connection and vibe matter as much as tasks', 'the_cozy_connector', 1, null);
-- Q6
insert into public.quiz_options (question_id, sort_order, option_text, outcome_slug, points, profile_writes) values
  ('b1000001-0000-4000-8000-000000000006', 1, 'In bursts when I have a window', 'survival_mode_warrior', 2, null),
  ('b1000001-0000-4000-8000-000000000006', 2, 'In blocks, with a clear order of operations', 'the_system_builder', 2, null),
  ('b1000001-0000-4000-8000-000000000006', 3, 'With a schedule—I like knowing what''s when', 'the_calendar_commander', 2, null),
  ('b1000001-0000-4000-8000-000000000006', 4, 'When the mood is right; I don''t force it', 'the_cozy_connector', 2, null);
-- Q7
insert into public.quiz_options (question_id, sort_order, option_text, outcome_slug, points, profile_writes) values
  ('b1000001-0000-4000-8000-000000000007', 1, 'Someone to catch the stuff that slips', 'survival_mode_warrior', 2, null),
  ('b1000001-0000-4000-8000-000000000007', 2, 'Someone to run my systems so I can improve them', 'the_system_builder', 2, null),
  ('b1000001-0000-4000-8000-000000000007', 3, 'Someone to own the calendar and coordination', 'the_calendar_commander', 2, null),
  ('b1000001-0000-4000-8000-000000000007', 4, 'Someone to handle the to-dos so I can be present', 'the_cozy_connector', 2, null);
