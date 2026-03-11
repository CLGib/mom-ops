-- No rush: member can opt in when creating a task to save 2 credits (turnaround within 3-5 business days).
alter table public.tickets
  add column if not exists no_rush boolean default false;

comment on column public.tickets.no_rush is 'Member opted in to flexible turnaround; we charge 2 fewer credits (minimum 0).';

-- Update charge trigger to apply no_rush discount (charge member 2 fewer credits).
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
    charge_credits := new.credit_cost - case when coalesce(new.no_rush, false) then 2 else 0 end;
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
