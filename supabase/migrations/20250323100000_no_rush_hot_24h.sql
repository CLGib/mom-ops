-- No-rush tickets: hot threshold is 24 hours (not 6). VA bonus applies only after 24h unclaimed.
create or replace function public.set_was_hot_when_claimed()
returns trigger as $$
begin
  if old.assigned_va_id is null and new.assigned_va_id is not null then
    new.was_hot_when_claimed := (
      current_timestamp - old.created_at >= case when coalesce(old.no_rush, false) then interval '24 hours' else interval '6 hours' end
    );
  end if;
  return new;
end;
$$ language plpgsql security definer;
