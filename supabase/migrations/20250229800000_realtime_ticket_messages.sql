-- Enable realtime for ticket_messages so VAs can see new messages as they arrive
-- If the table is already in the publication, this may error; safe to ignore or run once.
alter publication supabase_realtime add table public.ticket_messages;
