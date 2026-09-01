-- 30-day free trial (starts on a household's first transaction, not on signup) → paid
-- subscription (EUR 4.99/month per household, Stripe-billed). subscription_status is the single
-- source of truth for whether a household can currently write:
--   'none'     — no transaction has ever been recorded yet; nothing is gated.
--   'trialing' — running the 30-day trial from trial_started_at.
--   'active'   — paying via Stripe; always writable regardless of trial_started_at.
--   'past_due' — Stripe invoice failed; treated as read-only, no grace period.
--   'canceled' — Stripe subscription ended/canceled; read-only.
alter table public.households
  add column if not exists trial_started_at timestamptz,
  add column if not exists subscription_status text not null default 'none'
    check (subscription_status in ('none','trialing','active','past_due','canceled')),
  add column if not exists stripe_customer_id text unique,
  add column if not exists stripe_subscription_id text unique;

create or replace function public.household_is_writable(hid uuid) returns boolean
language sql stable security definer set search_path=public as $$
  select case h.subscription_status
    when 'none' then true
    when 'active' then true
    when 'trialing' then now() < h.trial_started_at + interval '30 days'
    else false
  end
  from households h where h.id = hid
$$;

revoke all on function public.household_is_writable(uuid) from public;
grant execute on function public.household_is_writable(uuid) to authenticated, service_role;

-- Idempotent and race-safe: if two members' first transactions land at nearly the same instant,
-- only one update matches subscription_status='none' and wins; the other is a no-op.
create or replace function public.activate_household_trial(hid uuid) returns void
language plpgsql security definer set search_path=public as $$
begin
  update households set subscription_status='trialing', trial_started_at=now()
  where id=hid and subscription_status='none';
end $$;

revoke all on function public.activate_household_trial(uuid) from public;
grant execute on function public.activate_household_trial(uuid) to authenticated, service_role;

-- Delivery/dedup ledger for trial reminder notifications, modeled on financial_insight_deliveries
-- (202608040001): insert a 'pending' row before sending; a unique violation means already handled;
-- flip to 'sent' on success; delete the pending row on failure so a retry can happen next run. Kept
-- as its own table (not a widened financial_insight_deliveries) since these are different domains
-- and this one needs an extra seen_at column (in-app banner dismissal) with no meaning for insights.
create table public.trial_notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  notification_key text not null check(notification_key in ('day20','day27','trial_ended')),
  channel text not null check(channel in ('in_app','telegram','email')),
  status text not null default 'pending' check(status in ('pending','sent')),
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  seen_at timestamptz, -- only meaningful for channel='in_app'; marks banner dismissal
  unique(user_id, channel, notification_key)
);

create index trial_notification_deliveries_household_idx
  on public.trial_notification_deliveries(household_id, created_at desc);

alter table public.trial_notification_deliveries enable row level security;

-- Only the cron (service role) inserts/sends. A narrow policy lets the owning user dismiss their
-- own in-app banner (set seen_at) without going through an admin client.
create policy "own trial notifications read" on public.trial_notification_deliveries
  for select using(user_id = auth.uid());
create policy "own trial notifications dismiss" on public.trial_notification_deliveries
  for update using(user_id = auth.uid() and channel = 'in_app')
  with check(user_id = auth.uid() and channel = 'in_app');

revoke update on public.trial_notification_deliveries from authenticated;
grant select on public.trial_notification_deliveries to authenticated;
grant update (seen_at) on public.trial_notification_deliveries to authenticated;

-- 2-person-per-household cap (price is "up to 2 people"). Existing households already above the
-- cap are grandfathered — this only blocks *new* joins once a household is at or over the limit.
-- Unchanged from 202608010001 except for the added member-count check.
create or replace function public.join_household(invite_code text) returns uuid
language plpgsql security definer set search_path=public as $$
declare inv household_invites%rowtype; member_count integer;
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;
  if exists(select 1 from household_members where user_id=auth.uid()) then raise exception 'Ya perteneces a un hogar'; end if;
  select * into inv from household_invites where code=upper(trim(invite_code)) and used_at is null and expires_at>now() for update;
  if not found then raise exception 'Invitación inválida o caducada'; end if;
  select count(*) into member_count from household_members where household_id=inv.household_id;
  if member_count >= 2 then raise exception 'Este hogar ya tiene el máximo de 2 personas'; end if;
  insert into household_members(household_id,user_id,role) values(inv.household_id,auth.uid(),'member');
  update household_invites set used_at=now(),used_by=auth.uid() where id=inv.id;
  return inv.household_id;
end $$;

-- Trial gate on every transaction-mutating RPC. Bodies below are otherwise unchanged from
-- 202608210001 (create_financial_transaction, create_financial_transaction_as_user,
-- update_financial_transaction) and 202608010003 (soft_delete_financial_transaction) — each keeps
-- its exact current signature so this genuinely replaces the function instead of creating a new
-- overload (Postgres treats a changed signature as a distinct function; see the note in
-- 202608180001 about this exact pitfall).
create or replace function public.create_financial_transaction(
  p_household_id uuid,p_account_id uuid,p_type text,p_amount_cents bigint,p_description text,p_category_id uuid,
  p_scope text,p_privacy text,p_transaction_date date,p_paid_by uuid,p_source text default 'web'
) returns uuid language plpgsql security definer set search_path=public as $$
declare tid uuid; member_count integer; base bigint; remainder bigint; member record; n integer:=0; acc_currency text;
begin
  if auth.uid() is null or not is_household_member(p_household_id) then raise exception 'Sin permiso en el hogar'; end if;
  if p_paid_by<>auth.uid() or not is_household_member(p_household_id,p_paid_by) then raise exception 'Pagador no válido'; end if;
  if p_amount_cents<=0 then raise exception 'El importe debe ser positivo'; end if;
  if p_type not in ('expense','income') or p_scope not in ('personal','shared') or p_privacy not in ('visible','private') then raise exception 'Datos no válidos'; end if;
  if p_scope='shared' and p_privacy='private' then raise exception 'Un movimiento compartido debe ser visible'; end if;
  select currency into acc_currency from accounts where id=p_account_id and household_id=p_household_id and archived_at is null and (is_shared or owner_user_id=auth.uid());
  if acc_currency is null then raise exception 'Cuenta no válida'; end if;
  if not exists(select 1 from categories where id=p_category_id and kind=p_type and (household_id is null or household_id=p_household_id)) then raise exception 'Categoría no válida'; end if;
  perform activate_household_trial(p_household_id);
  if not household_is_writable(p_household_id) then
    raise exception 'READ_ONLY_TRIAL: Tu prueba de 30 días terminó. Activá tu suscripción para seguir registrando movimientos.';
  end if;
  insert into transactions(household_id,created_by,paid_by,account_id,type,amount_cents,currency,description,category_id,scope,privacy,transaction_date,source)
  values(p_household_id,auth.uid(),p_paid_by,p_account_id,p_type,p_amount_cents,acc_currency,trim(p_description),p_category_id,p_scope,p_privacy,p_transaction_date,p_source) returning id into tid;
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
  p_scope text,p_privacy text,p_transaction_date date,p_paid_by uuid,p_source text default 'telegram',p_items jsonb default null
) returns uuid language plpgsql security definer set search_path=public as $$
declare tid uuid; member_count integer; base bigint; remainder bigint; member record; n integer:=0; item jsonb; acc_currency text;
begin
  if p_source<>'telegram' or not is_household_member(p_household_id,p_actor_user_id) then raise exception 'Actor sin permiso'; end if;
  if p_paid_by<>p_actor_user_id or p_amount_cents<=0 then raise exception 'Datos financieros no válidos'; end if;
  if p_type not in ('expense','income') or p_scope not in ('personal','shared') or p_privacy not in ('visible','private') then raise exception 'Datos no válidos'; end if;
  if (p_scope='shared' and p_privacy<>'visible') or (p_scope='personal' and p_privacy<>'private') then raise exception 'Privacidad incompatible con el ámbito'; end if;
  select currency into acc_currency from accounts where id=p_account_id and household_id=p_household_id and archived_at is null
    and ((p_scope='shared' and is_shared) or (p_scope='personal' and not is_shared and owner_user_id=p_actor_user_id));
  if acc_currency is null then raise exception 'Cuenta no válida para este ámbito'; end if;
  if not exists(select 1 from categories where id=p_category_id and kind=p_type and (household_id is null or household_id=p_household_id)) then raise exception 'Categoría no válida'; end if;
  perform activate_household_trial(p_household_id);
  if not household_is_writable(p_household_id) then
    raise exception 'READ_ONLY_TRIAL: Tu prueba de 30 días terminó. Activá tu suscripción para seguir registrando movimientos.';
  end if;
  insert into transactions(household_id,created_by,paid_by,account_id,type,amount_cents,currency,description,category_id,scope,privacy,transaction_date,source)
  values(p_household_id,p_actor_user_id,p_paid_by,p_account_id,p_type,p_amount_cents,acc_currency,trim(p_description),p_category_id,p_scope,p_privacy,p_transaction_date,p_source) returning id into tid;
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

create or replace function public.update_financial_transaction(
  p_transaction_id uuid,p_account_id uuid,p_amount_cents bigint,p_description text,p_category_id uuid,
  p_scope text,p_privacy text,p_transaction_date date
) returns void language plpgsql security definer set search_path=public as $$
declare tx transactions%rowtype; member_count integer; base bigint; remainder bigint; member record; n integer:=0; acc_currency text;
begin
  select * into tx from transactions where id=p_transaction_id and created_by=auth.uid() and status='confirmed' for update;
  if not found then raise exception 'Movimiento no encontrado o sin permiso'; end if;
  if not household_is_writable(tx.household_id) then
    raise exception 'READ_ONLY_TRIAL: Tu prueba de 30 días terminó. Activá tu suscripción para editar movimientos.';
  end if;
  if p_amount_cents<=0 or p_scope not in ('personal','shared') or p_privacy not in ('visible','private') then raise exception 'Datos no válidos'; end if;
  if (p_scope='shared' and p_privacy<>'visible') or (p_scope='personal' and p_privacy<>'private') then raise exception 'Privacidad incompatible con el ámbito'; end if;
  select currency into acc_currency from accounts where id=p_account_id and household_id=tx.household_id and archived_at is null
    and ((p_scope='shared' and is_shared) or (p_scope='personal' and not is_shared and owner_user_id=auth.uid()));
  if acc_currency is null then raise exception 'Cuenta no válida para este ámbito'; end if;
  if not exists(select 1 from categories where id=p_category_id and kind=tx.type and (household_id is null or household_id=tx.household_id)) then raise exception 'Categoría no válida'; end if;
  update transactions set account_id=p_account_id,amount_cents=p_amount_cents,currency=acc_currency,description=trim(p_description),category_id=p_category_id,scope=p_scope,privacy=p_privacy,transaction_date=p_transaction_date where id=p_transaction_id;
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

create or replace function public.soft_delete_financial_transaction(p_transaction_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare tx transactions%rowtype;
begin
  select * into tx from transactions where id=p_transaction_id and created_by=auth.uid() and status='confirmed' for update;
  if not found then raise exception 'Movimiento no encontrado o sin permiso'; end if;
  if not household_is_writable(tx.household_id) then
    raise exception 'READ_ONLY_TRIAL: Tu prueba de 30 días terminó. Activá tu suscripción para eliminar movimientos.';
  end if;
  update transactions set status='deleted',deleted_at=now() where id=p_transaction_id;
end $$;
