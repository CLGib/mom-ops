-- When a task is completed/closed and the member is charged, also record the VA's earnings
-- ($0.20 per credit + tip in cents). One row per ticket.

create or replace function public.on_ticket_completed()
returns trigger as $$
declare
  v_amount_cents integer;
begin
  if (new.status = 'completed' or new.status = 'closed')
     and (old.status is null or (old.status <> 'completed' and old.status <> 'closed'))
     and new.credit_cost is not null
     and new.credit_cost > 0
  then
    -- Charge member (once per ticket)
    if not exists (
      select 1 from public.credit_transactions
      where ticket_id = new.id and type = 'task_charge'
    ) then
      insert into public.credit_transactions (member_id, ticket_id, amount, type)
      values (new.member_id, new.id, -new.credit_cost, 'task_charge');
    end if;

    -- Record VA earnings: $0.20 per credit (= 20 cents per credit) + tip (already in cents)
    if new.assigned_va_id is not null
       and not exists (select 1 from public.va_task_earnings where ticket_id = new.id)
    then
      v_amount_cents := (new.credit_cost * 20) + coalesce(new.tip_amount, 0);
      insert into public.va_task_earnings (va_id, ticket_id, amount_cents)
      values (new.assigned_va_id, new.id, v_amount_cents);
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;
