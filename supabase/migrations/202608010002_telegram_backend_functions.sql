-- Secret-key-only functions used by the Telegram webhook. The new sb_secret
-- API key is represented internamente by Supabase's service_role Postgres role.
-- They accept an
-- explicit actor because webhook requests do not carry a Supabase user JWT.
create or replace function public.link_telegram_account(p_code text,p_telegram_user_id bigint,p_telegram_chat_id bigint)
returns uuid language plpgsql security definer set search_path=public as $$
declare link_code telegram_link_codes%rowtype;
begin
  select * into link_code from telegram_link_codes where code=upper(trim(p_code)) and used_at is null and expires_at>now() for update;
  if not found then raise exception 'Código inválido o caducado'; end if;
  insert into telegram_links(user_id,telegram_user_id,telegram_chat_id) values(link_code.user_id,p_telegram_user_id,p_telegram_chat_id)
  on conflict(user_id) do update set telegram_user_id=excluded.telegram_user_id,telegram_chat_id=excluded.telegram_chat_id,linked_at=now();
  update telegram_link_codes set used_at=now() where id=link_code.id;
  return link_code.user_id;
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
  if p_scope='shared' and p_privacy='private' then raise exception 'Un movimiento compartido debe ser visible'; end if;
  if not exists(select 1 from accounts where id=p_account_id and household_id=p_household_id and archived_at is null and (is_shared or owner_user_id=p_actor_user_id)) then raise exception 'Cuenta no válida'; end if;
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

revoke all on function public.link_telegram_account(text,bigint,bigint) from public,anon,authenticated;
grant execute on function public.link_telegram_account(text,bigint,bigint) to service_role;
revoke all on function public.create_financial_transaction_as_user(uuid,uuid,uuid,text,bigint,text,uuid,text,text,date,uuid,text) from public,anon,authenticated;
grant execute on function public.create_financial_transaction_as_user(uuid,uuid,uuid,text,bigint,text,uuid,text,text,date,uuid,text) to service_role;
