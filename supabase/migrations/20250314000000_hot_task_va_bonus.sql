-- Hot task: unclaimed 6+ hours. When a VA claims, set was_hot_when_claimed so payout can apply 10% bonus.
alter table public.tickets
  add column if not exists was_hot_when_claimed boolean default false;

comment on column public.tickets.was_hot_when_claimed is 'True if ticket had been unclaimed for 6+ hours when the VA claimed it; VA earns 10% more on these tasks.';

create or replace function public.set_was_hot_when_claimed()
returns trigger as $$
begin
  if old.assigned_va_id is null and new.assigned_va_id is not null then
    new.was_hot_when_claimed := (current_timestamp - old.created_at >= interval '6 hours');
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists tickets_set_was_hot_when_claimed on public.tickets;
create trigger tickets_set_was_hot_when_claimed
  before update on public.tickets
  for each row
  execute function public.set_was_hot_when_claimed();
