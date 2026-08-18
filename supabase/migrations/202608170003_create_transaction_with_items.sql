-- Lets a Telegram create_transaction action carry an itemized breakdown (e.g. "gasté 50 euros en
-- el súper, 25 en pollo y 25 en bistec de ternera") and insert transaction_items atomically in the
-- same transaction as the parent row, instead of a separate follow-up insert from application code.
-- p_items is appended with a default so existing callers that omit it are unaffected.
create or replace function public.create_financial_transaction_as_user(
  p_actor_user_id uuid,p_household_id uuid,p_account_id uuid,p_type text,p_amount_cents bigint,p_description text,p_category_id uuid,
  p_scope text,p_privacy text,p_transaction_date date,p_paid_by uuid,p_source text default 'telegram',p_items jsonb default null
) returns uuid language plpgsql security definer set search_path=public as $$
declare tid uuid; member_count integer; base bigint; remainder bigint; member record; n integer:=0; item jsonb;
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
  if p_items is not null then
    for item in select * from jsonb_array_elements(p_items) loop
      insert into transaction_items(transaction_id,description,amount_cents,subcategory)
      values(tid,item->>'description',(item->>'amount_cents')::bigint,item->>'subcategory');
    end loop;
  end if;
  return tid;
end $$;

revoke all on function public.create_financial_transaction_as_user(uuid,uuid,uuid,text,bigint,text,uuid,text,text,date,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.create_financial_transaction_as_user(uuid,uuid,uuid,text,bigint,text,uuid,text,text,date,uuid,text,jsonb) to service_role;
