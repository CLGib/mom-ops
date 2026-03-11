-- Block VA from setting ticket status to completed/closed when credit_cost is not set.
-- Admins can still close without setting cost if needed.

create or replace function public.tickets_va_must_set_credit_cost()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_user_role() = 'va'
     and new.status in ('completed', 'closed')
     and new.credit_cost is null then
    raise exception 'Set credit cost before closing or completing this task.'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists tickets_va_must_set_credit_cost on public.tickets;
create trigger tickets_va_must_set_credit_cost
  before update on public.tickets
  for each row
  when (
    new.status is distinct from old.status
    and new.status in ('completed', 'closed')
  )
  execute function public.tickets_va_must_set_credit_cost();
