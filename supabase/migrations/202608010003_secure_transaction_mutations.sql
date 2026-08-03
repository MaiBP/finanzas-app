create or replace function public.update_financial_transaction(
  p_transaction_id uuid,p_account_id uuid,p_amount_cents bigint,p_description text,p_category_id uuid,
  p_scope text,p_privacy text,p_transaction_date date
) returns void language plpgsql security definer set search_path=public as $$
declare tx transactions%rowtype; member_count integer; base bigint; remainder bigint; member record; n integer:=0;
begin
  select * into tx from transactions where id=p_transaction_id and created_by=auth.uid() and status='confirmed' for update;
  if not found then raise exception 'Movimiento no encontrado o sin permiso'; end if;
  if p_amount_cents<=0 or p_scope not in ('personal','shared') or p_privacy not in ('visible','private') or (p_scope='shared' and p_privacy='private') then raise exception 'Datos no válidos'; end if;
  if not exists(select 1 from accounts where id=p_account_id and household_id=tx.household_id and archived_at is null and (is_shared or owner_user_id=auth.uid())) then raise exception 'Cuenta no válida'; end if;
  if not exists(select 1 from categories where id=p_category_id and kind=tx.type and (household_id is null or household_id=tx.household_id)) then raise exception 'Categoría no válida'; end if;
  update transactions set account_id=p_account_id,amount_cents=p_amount_cents,description=trim(p_description),category_id=p_category_id,scope=p_scope,privacy=p_privacy,transaction_date=p_transaction_date where id=p_transaction_id;
  delete from transaction_splits where transaction_id=p_transaction_id;
  if tx.type='expense' and p_scope='shared' then
    select count(*) into member_count from household_members where household_id=tx.household_id;
    base:=p_amount_cents/member_count; remainder:=p_amount_cents%member_count;
    for member in select user_id from household_members where household_id=tx.household_id order by joined_at loop
      n:=n+1; insert into transaction_splits(transaction_id,user_id,amount_cents,percentage) values(p_transaction_id,member.user_id,base+case when n<=remainder then 1 else 0 end,round(100.0/member_count,2));
    end loop;
  end if;
end $$;

create or replace function public.soft_delete_financial_transaction(p_transaction_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
  update transactions set status='deleted',deleted_at=now() where id=p_transaction_id and created_by=auth.uid() and status='confirmed';
  if not found then raise exception 'Movimiento no encontrado o sin permiso'; end if;
end $$;

revoke insert,update,delete on public.transactions from authenticated;
revoke insert,update,delete on public.transaction_splits from authenticated;
revoke all on function public.update_financial_transaction(uuid,uuid,bigint,text,uuid,text,text,date) from public;
grant execute on function public.update_financial_transaction(uuid,uuid,bigint,text,uuid,text,text,date) to authenticated;
revoke all on function public.soft_delete_financial_transaction(uuid) from public;
grant execute on function public.soft_delete_financial_transaction(uuid) to authenticated;
