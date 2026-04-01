-- VA earnings: use va_profiles.payment_per_credit (default $0.20) instead of hardcoded 20 cents/credit.

create or replace function public.on_ticket_completed()
returns trigger as $$
declare
  v_amount_cents integer;
  v_payment_per_credit numeric;
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

    -- Record VA earnings: (payment_per_credit dollars per credit → cents) + tip
    if new.assigned_va_id is not null
       and not exists (select 1 from public.va_task_earnings where ticket_id = new.id)
    then
      select coalesce(vp.payment_per_credit, 0.2)
        into v_payment_per_credit
        from public.va_profiles vp
       where vp.user_id = new.assigned_va_id;
      v_payment_per_credit := coalesce(v_payment_per_credit, 0.2);
      v_amount_cents := (new.credit_cost * (v_payment_per_credit * 100))::integer + coalesce(new.tip_amount, 0);
      insert into public.va_task_earnings (va_id, ticket_id, amount_cents)
      values (new.assigned_va_id, new.id, v_amount_cents);
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;
