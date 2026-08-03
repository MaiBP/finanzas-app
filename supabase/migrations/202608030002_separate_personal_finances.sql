-- Separate shared household finances from each member's private workspace.
update public.transactions set privacy='private' where scope='personal' and privacy<>'private';

alter table public.transactions drop constraint if exists transactions_scope_privacy_consistent;
alter table public.transactions add constraint transactions_scope_privacy_consistent
  check ((scope='shared' and privacy='visible') or (scope='personal' and privacy='private'));

drop policy if exists "transactions visible in household" on public.transactions;
create policy "shared or own personal transactions read" on public.transactions for select
using (
  is_household_member(household_id)
  and (scope='shared' or (scope='personal' and created_by=auth.uid()))
);

create or replace function public.create_financial_transaction(
  p_household_id uuid,p_account_id uuid,p_type text,p_amount_cents bigint,p_description text,p_category_id uuid,
  p_scope text,p_privacy text,p_transaction_date date,p_paid_by uuid,p_source text default 'web'
) returns uuid language plpgsql security definer set search_path=public as $$
declare tid uuid; member_count integer; base bigint; remainder bigint; member record; n integer:=0;
begin
  if auth.uid() is null or not is_household_member(p_household_id) then raise exception 'Sin permiso en el hogar'; end if;
  if p_paid_by<>auth.uid() or not is_household_member(p_household_id,p_paid_by) then raise exception 'Pagador no válido'; end if;
  if p_amount_cents<=0 then raise exception 'El importe debe ser positivo'; end if;
  if p_type not in ('expense','income') or p_scope not in ('personal','shared') or p_privacy not in ('visible','private') then raise exception 'Datos no válidos'; end if;
  if (p_scope='shared' and p_privacy<>'visible') or (p_scope='personal' and p_privacy<>'private') then raise exception 'Privacidad incompatible con el ámbito'; end if;
  if not exists(
    select 1 from accounts where id=p_account_id and household_id=p_household_id and archived_at is null
    and ((p_scope='shared' and is_shared) or (p_scope='personal' and not is_shared and owner_user_id=auth.uid()))
  ) then raise exception 'Cuenta no válida para este ámbito'; end if;
  if not exists(select 1 from categories where id=p_category_id and kind=p_type and (household_id is null or household_id=p_household_id)) then raise exception 'Categoría no válida'; end if;
  insert into transactions(household_id,created_by,paid_by,account_id,type,amount_cents,description,category_id,scope,privacy,transaction_date,source)
  values(p_household_id,auth.uid(),p_paid_by,p_account_id,p_type,p_amount_cents,trim(p_description),p_category_id,p_scope,p_privacy,p_transaction_date,p_source) returning id into tid;
  if p_type='expense' and p_scope='shared' then
    select count(*) into member_count from household_members where household_id=p_household_id;
    base:=p_amount_cents/member_count; remainder:=p_amount_cents%member_count;
    for member in select user_id from household_members where household_id=p_household_id order by joined_at loop
      n:=n+1; insert into transaction_splits(transaction_id,user_id,amount_cents,percentage)
      values(tid,member.user_id,base+case when n<=remainder then 1 else 0 end,round(100.0/member_count,2));
    end loop;
  end if;
  return tid;
end $$;

create or replace function public.create_financial_transaction_as_user(
  p_actor_user_id uuid,p_household_id uuid,p_account_id uuid,p_type text,p_amount_cents bigint,p_description text,p_category_id uuid,
  p_scope text,p_privacy text,p_transaction_date date,p_paid_by uuid,p_source text default 'telegram'
) returns uuid language plpgsql security definer set search_path=public as $$
declare tid uuid; member_count integer; base bigint; remainder bigint; member record; n integer:=0;
begin
  if p_source<>'telegram' or not is_household_member(p_household_id,p_actor_user_id) then raise exception 'Actor sin permiso'; end if;
  if p_paid_by<>p_actor_user_id or p_amount_cents<=0 then raise exception 'Datos financieros no válidos'; end if;
  if p_type not in ('expense','income') or p_scope not in ('personal','shared') or p_privacy not in ('visible','private') then raise exception 'Datos no válidos'; end if;
  if (p_scope='shared' and p_privacy<>'visible') or (p_scope='personal' and p_privacy<>'private') then raise exception 'Privacidad incompatible con el ámbito'; end if;
  if not exists(
    select 1 from accounts where id=p_account_id and household_id=p_household_id and archived_at is null
    and ((p_scope='shared' and is_shared) or (p_scope='personal' and not is_shared and owner_user_id=p_actor_user_id))
  ) then raise exception 'Cuenta no válida para este ámbito'; end if;
  if not exists(select 1 from categories where id=p_category_id and kind=p_type and (household_id is null or household_id=p_household_id)) then raise exception 'Categoría no válida'; end if;
  insert into transactions(household_id,created_by,paid_by,account_id,type,amount_cents,description,category_id,scope,privacy,transaction_date,source)
  values(p_household_id,p_actor_user_id,p_paid_by,p_account_id,p_type,p_amount_cents,trim(p_description),p_category_id,p_scope,p_privacy,p_transaction_date,p_source) returning id into tid;
  if p_type='expense' and p_scope='shared' then
    select count(*) into member_count from household_members where household_id=p_household_id;
    base:=p_amount_cents/member_count; remainder:=p_amount_cents%member_count;
    for member in select user_id from household_members where household_id=p_household_id order by joined_at loop
      n:=n+1; insert into transaction_splits(transaction_id,user_id,amount_cents,percentage)
      values(tid,member.user_id,base+case when n<=remainder then 1 else 0 end,round(100.0/member_count,2));
    end loop;
  end if;
  return tid;
end $$;

create or replace function public.update_financial_transaction(
  p_transaction_id uuid,p_account_id uuid,p_amount_cents bigint,p_description text,p_category_id uuid,
  p_scope text,p_privacy text,p_transaction_date date
) returns void language plpgsql security definer set search_path=public as $$
declare tx transactions%rowtype; member_count integer; base bigint; remainder bigint; member record; n integer:=0;
begin
  select * into tx from transactions where id=p_transaction_id and created_by=auth.uid() and status='confirmed' for update;
  if not found then raise exception 'Movimiento no encontrado o sin permiso'; end if;
  if p_amount_cents<=0 or p_scope not in ('personal','shared') or p_privacy not in ('visible','private') then raise exception 'Datos no válidos'; end if;
  if (p_scope='shared' and p_privacy<>'visible') or (p_scope='personal' and p_privacy<>'private') then raise exception 'Privacidad incompatible con el ámbito'; end if;
  if not exists(
    select 1 from accounts where id=p_account_id and household_id=tx.household_id and archived_at is null
    and ((p_scope='shared' and is_shared) or (p_scope='personal' and not is_shared and owner_user_id=auth.uid()))
  ) then raise exception 'Cuenta no válida para este ámbito'; end if;
  if not exists(select 1 from categories where id=p_category_id and kind=tx.type and (household_id is null or household_id=tx.household_id)) then raise exception 'Categoría no válida'; end if;
  update transactions set account_id=p_account_id,amount_cents=p_amount_cents,description=trim(p_description),category_id=p_category_id,scope=p_scope,privacy=p_privacy,transaction_date=p_transaction_date where id=p_transaction_id;
  delete from transaction_splits where transaction_id=p_transaction_id;
  if tx.type='expense' and p_scope='shared' then
    select count(*) into member_count from household_members where household_id=tx.household_id;
    base:=p_amount_cents/member_count; remainder:=p_amount_cents%member_count;
    for member in select user_id from household_members where household_id=tx.household_id order by joined_at loop
      n:=n+1; insert into transaction_splits(transaction_id,user_id,amount_cents,percentage)
      values(p_transaction_id,member.user_id,base+case when n<=remainder then 1 else 0 end,round(100.0/member_count,2));
    end loop;
  end if;
end $$;

revoke all on function public.create_financial_transaction(uuid,uuid,text,bigint,text,uuid,text,text,date,uuid,text) from public;
grant execute on function public.create_financial_transaction(uuid,uuid,text,bigint,text,uuid,text,text,date,uuid,text) to authenticated;
revoke all on function public.create_financial_transaction_as_user(uuid,uuid,uuid,text,bigint,text,uuid,text,text,date,uuid,text) from public,anon,authenticated;
grant execute on function public.create_financial_transaction_as_user(uuid,uuid,uuid,text,bigint,text,uuid,text,text,date,uuid,text) to service_role;
revoke all on function public.update_financial_transaction(uuid,uuid,bigint,text,uuid,text,text,date) from public;
grant execute on function public.update_financial_transaction(uuid,uuid,bigint,text,uuid,text,text,date) to authenticated;
