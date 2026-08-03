-- The general joint account is now a virtual aggregate, not a funding source.
-- New households start without a physical `joint` account and create their own
-- operational cash, bank, card, savings or investment accounts.
create or replace function public.prevent_general_account_movements() returns trigger
language plpgsql set search_path=public as $$
begin
  if exists(select 1 from accounts where id=new.account_id and type='joint') then
    if tg_op='INSERT' then
      raise exception 'La cuenta conjunta general es un resumen y no admite movimientos directos';
    elsif new.account_id is distinct from old.account_id then
      raise exception 'La cuenta conjunta general es un resumen y no admite movimientos directos';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists prevent_general_account_movements on public.transactions;
create trigger prevent_general_account_movements
before insert or update of account_id on public.transactions
for each row execute function public.prevent_general_account_movements();

create or replace function public.create_household(household_name text) returns uuid
language plpgsql security definer set search_path=public as $$
declare hid uuid; invite text;
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;
  if exists(select 1 from household_members where user_id=auth.uid()) then raise exception 'Ya perteneces a un hogar'; end if;
  if char_length(trim(household_name)) not between 2 and 80 then raise exception 'Nombre no válido'; end if;
  insert into households(name,created_by) values(trim(household_name),auth.uid()) returning id into hid;
  insert into household_members(household_id,user_id,role) values(hid,auth.uid(),'owner');
  invite := upper(substr(encode(extensions.gen_random_bytes(6),'hex'),1,8));
  insert into household_invites(household_id,code,created_by,expires_at) values(hid,invite,auth.uid(),now()+interval '7 days');
  return hid;
end $$;

revoke all on function public.create_household(text) from public;
grant execute on function public.create_household(text) to authenticated;
