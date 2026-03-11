-- Enable realtime for tickets so VAs see new/unassigned tasks in "Claim more tasks" without refresh
alter publication supabase_realtime add table public.tickets;
