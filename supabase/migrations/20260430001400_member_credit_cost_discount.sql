-- Reduce member task charges by 20% (round down) before no_rush discount.
create or replace function public.on_ticket_completed()
returns trigger as $$
declare
  charge_credits int;
begin
  if (new.status = 'completed' or new.status = 'closed')
     and (old.status is null or (old.status <> 'completed' and old.status <> 'closed'))
     and new.credit_cost is not null
     and new.credit_cost > 0
  then
    charge_credits := floor(new.credit_cost * 0.8)::int;
    charge_credits := charge_credits - case when coalesce(new.no_rush, false) then 2 else 0 end;
    charge_credits := greatest(charge_credits, 0);
    if charge_credits > 0
       and not exists (
         select 1 from public.credit_transactions
         where ticket_id = new.id and type = 'task_charge'
       )
    then
      insert into public.credit_transactions (member_id, ticket_id, amount, type)
      values (new.member_id, new.id, -charge_credits, 'task_charge');
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;
