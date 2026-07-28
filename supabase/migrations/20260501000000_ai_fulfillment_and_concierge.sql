-- AI-first fulfillment + human concierge upsell.
-- Additive columns only; no status enum / CHECK constraint changes.
--
-- ai_generated:          this ticket's deliverable was produced by the AI engine (/api/tasks/fulfill)
-- ai_fulfilled_at:       when the AI deliverable was posted
-- concierge_requested:   member asked for a human to take the task further (paid upsell)
-- concierge_requested_at:when that request was made

alter table public.tickets
  add column if not exists ai_generated boolean not null default false;

alter table public.tickets
  add column if not exists ai_fulfilled_at timestamptz;

alter table public.tickets
  add column if not exists concierge_requested boolean not null default false;

alter table public.tickets
  add column if not exists concierge_requested_at timestamptz;

-- Helps the admin surface "who wants a human" quickly.
create index if not exists tickets_concierge_requested_idx
  on public.tickets (concierge_requested)
  where concierge_requested = true;
