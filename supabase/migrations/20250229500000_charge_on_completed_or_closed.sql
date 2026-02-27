-- Debit member by credit_cost when task is completed or closed (charge once per ticket)
create or replace function public.on_ticket_completed()
returns trigger as $$
begin
  if (new.status = 'completed' or new.status = 'closed')
     and (old.status is null or (old.status <> 'completed' and old.status <> 'closed'))
     and new.credit_cost is not null
     and new.credit_cost > 0
  then
    if not exists (
      select 1 from public.credit_transactions
      where ticket_id = new.id and type = 'task_charge'
    ) then
      insert into public.credit_transactions (member_id, ticket_id, amount, type)
      values (new.member_id, new.id, -new.credit_cost, 'task_charge');
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;
