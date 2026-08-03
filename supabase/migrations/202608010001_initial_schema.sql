-- A medias: initial schema. All money values are integer cents.
create extension if not exists pgcrypto;

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (char_length(display_name) between 1 and 60),
  locale text not null default 'es', timezone text not null default 'Europe/Madrid',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.households (
  id uuid primary key default gen_random_uuid(), name text not null check (char_length(name) between 2 and 80),
  currency char(3) not null default 'EUR', created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('owner','member')), joined_at timestamptz not null default now(),
  primary key (household_id,user_id), unique(user_id)
);
create table public.household_invites (
  id uuid primary key default gen_random_uuid(), household_id uuid not null references public.households(id) on delete cascade,
  code text not null unique check (code ~ '^[A-Z0-9]{8}$'), created_by uuid not null references public.profiles(id),
  expires_at timestamptz not null, used_by uuid references public.profiles(id), used_at timestamptz,
  created_at timestamptz not null default now(), check (expires_at > created_at)
);
create table public.accounts (
  id uuid primary key default gen_random_uuid(), household_id uuid not null references public.households(id) on delete cascade,
  owner_user_id uuid references public.profiles(id), name text not null check (char_length(name) between 1 and 80),
  type text not null check(type in ('bank','card','cash','joint','savings')), currency char(3) not null default 'EUR',
  current_balance_cents bigint not null default 0, is_shared boolean not null default false, archived_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check ((is_shared and owner_user_id is null) or (not is_shared and owner_user_id is not null))
);
create table public.categories (
  id uuid primary key default gen_random_uuid(), household_id uuid references public.households(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60), kind text not null check(kind in ('expense','income')),
  icon text, color text, created_by uuid references public.profiles(id), created_at timestamptz not null default now(),
  unique nulls not distinct (household_id,name,kind)
);
create table public.transactions (
  id uuid primary key default gen_random_uuid(), household_id uuid not null references public.households(id) on delete cascade,
  created_by uuid not null references public.profiles(id), paid_by uuid not null references public.profiles(id),
  account_id uuid not null references public.accounts(id), type text not null check(type in ('expense','income')),
  amount_cents bigint not null check(amount_cents > 0), currency char(3) not null default 'EUR',
  description text not null check(char_length(description) between 2 and 160), category_id uuid not null references public.categories(id),
  scope text not null check(scope in ('personal','shared')), privacy text not null default 'visible' check(privacy in ('visible','private')),
  transaction_date date not null, source text not null check(source in ('web','telegram','system')),
  status text not null default 'confirmed' check(status in ('confirmed','pending','deleted')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  check (scope <> 'shared' or privacy = 'visible'), check ((status = 'deleted') = (deleted_at is not null))
);
create table public.transaction_splits (
  id uuid primary key default gen_random_uuid(), transaction_id uuid not null references public.transactions(id) on delete cascade,
  user_id uuid not null references public.profiles(id), amount_cents bigint not null check(amount_cents >= 0),
  percentage numeric(5,2) not null check(percentage between 0 and 100), created_at timestamptz not null default now(),
  unique(transaction_id,user_id)
);
create table public.telegram_links (
  id uuid primary key default gen_random_uuid(), user_id uuid not null unique references public.profiles(id) on delete cascade,
  telegram_user_id bigint not null unique, telegram_chat_id bigint not null, linked_at timestamptz not null default now()
);
create table public.telegram_link_codes (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  code text not null unique, expires_at timestamptz not null, used_at timestamptz, created_at timestamptz not null default now(),
  check(expires_at > created_at)
);
create table public.pending_actions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  household_id uuid not null references public.households(id) on delete cascade, action_type text not null,
  payload jsonb not null, expires_at timestamptz not null, created_at timestamptz not null default now(), check(expires_at > created_at)
);
create table public.conversation_messages (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  household_id uuid not null references public.households(id) on delete cascade, role text not null check(role in ('user','assistant','system')),
  content text not null, created_at timestamptz not null default now()
);
create table public.audit_logs (
  id bigint generated always as identity primary key, user_id uuid references public.profiles(id),
  household_id uuid not null references public.households(id) on delete cascade, entity_type text not null, entity_id uuid not null,
  action text not null check(action in ('created','updated','deleted','restored')), old_values jsonb, new_values jsonb,
  source text not null check(source in ('web','telegram','system')), created_at timestamptz not null default now()
);

create index household_members_user_idx on public.household_members(user_id);
create index invites_code_active_idx on public.household_invites(code,expires_at) where used_at is null;
create index accounts_household_idx on public.accounts(household_id) where archived_at is null;
create index categories_household_kind_idx on public.categories(household_id,kind);
create index transactions_household_date_idx on public.transactions(household_id,transaction_date desc) where status='confirmed';
create index transactions_creator_idx on public.transactions(created_by,created_at desc);
create index splits_transaction_idx on public.transaction_splits(transaction_id);
create index pending_user_expiry_idx on public.pending_actions(user_id,expires_at);
create index conversation_user_idx on public.conversation_messages(user_id,created_at desc);
create index audit_household_entity_idx on public.audit_logs(household_id,entity_type,entity_id,created_at desc);

create trigger profiles_updated before update on public.profiles for each row execute function public.set_updated_at();
create trigger households_updated before update on public.households for each row execute function public.set_updated_at();
create trigger accounts_updated before update on public.accounts for each row execute function public.set_updated_at();
create trigger transactions_updated before update on public.transactions for each row execute function public.set_updated_at();

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into public.profiles(id,display_name) values(new.id,coalesce(new.raw_user_meta_data->>'display_name',split_part(new.email,'@',1))); return new; end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.is_household_member(hid uuid, uid uuid default auth.uid()) returns boolean
language sql stable security definer set search_path=public as $$ select exists(select 1 from household_members where household_id=hid and user_id=uid) $$;
create or replace function public.is_household_owner(hid uuid, uid uuid default auth.uid()) returns boolean
language sql stable security definer set search_path=public as $$ select exists(select 1 from household_members where household_id=hid and user_id=uid and role='owner') $$;

create or replace function public.create_household(household_name text) returns uuid
language plpgsql security definer set search_path=public as $$
declare hid uuid; invite text;
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;
  if exists(select 1 from household_members where user_id=auth.uid()) then raise exception 'Ya perteneces a un hogar'; end if;
  if char_length(trim(household_name)) not between 2 and 80 then raise exception 'Nombre no válido'; end if;
  insert into households(name,created_by) values(trim(household_name),auth.uid()) returning id into hid;
  insert into household_members(household_id,user_id,role) values(hid,auth.uid(),'owner');
  insert into accounts(household_id,owner_user_id,name,type,is_shared) values(hid,null,'Cuenta conjunta','joint',true);
  invite := upper(substr(encode(gen_random_bytes(6),'hex'),1,8));
  insert into household_invites(household_id,code,created_by,expires_at) values(hid,invite,auth.uid(),now()+interval '7 days');
  return hid;
end $$;

create or replace function public.join_household(invite_code text) returns uuid
language plpgsql security definer set search_path=public as $$
declare inv household_invites%rowtype;
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;
  if exists(select 1 from household_members where user_id=auth.uid()) then raise exception 'Ya perteneces a un hogar'; end if;
  select * into inv from household_invites where code=upper(trim(invite_code)) and used_at is null and expires_at>now() for update;
  if not found then raise exception 'Invitación inválida o caducada'; end if;
  insert into household_members(household_id,user_id,role) values(inv.household_id,auth.uid(),'member');
  update household_invites set used_at=now(),used_by=auth.uid() where id=inv.id;
  return inv.household_id;
end $$;

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
  if p_scope='shared' and p_privacy='private' then raise exception 'Un movimiento compartido debe ser visible'; end if;
  if not exists(select 1 from accounts where id=p_account_id and household_id=p_household_id and archived_at is null and (is_shared or owner_user_id=auth.uid())) then raise exception 'Cuenta no válida'; end if;
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

create or replace function public.audit_transaction_change() returns trigger language plpgsql security definer set search_path=public as $$
declare audit_action text; actor uuid; src text;
begin
  actor:=coalesce(auth.uid(),new.created_by,old.created_by); src:=coalesce(new.source,old.source,'system');
  if tg_op='INSERT' then audit_action:='created';
  elsif old.status<>'deleted' and new.status='deleted' then audit_action:='deleted';
  elsif old.status='deleted' and new.status<>'deleted' then audit_action:='restored'; else audit_action:='updated'; end if;
  insert into audit_logs(user_id,household_id,entity_type,entity_id,action,old_values,new_values,source)
  values(actor,coalesce(new.household_id,old.household_id),'transaction',coalesce(new.id,old.id),audit_action,
    case when tg_op='INSERT' then null else to_jsonb(old) end,case when tg_op='DELETE' then null else to_jsonb(new) end,src);
  return coalesce(new,old);
end $$;
create trigger audit_transactions after insert or update or delete on public.transactions for each row execute function public.audit_transaction_change();

alter table public.profiles enable row level security; alter table public.households enable row level security;
alter table public.household_members enable row level security; alter table public.household_invites enable row level security;
alter table public.accounts enable row level security; alter table public.categories enable row level security;
alter table public.transactions enable row level security; alter table public.transaction_splits enable row level security;
alter table public.telegram_links enable row level security; alter table public.telegram_link_codes enable row level security;
alter table public.pending_actions enable row level security; alter table public.conversation_messages enable row level security;
alter table public.audit_logs enable row level security;

create policy "profile self or household peers read" on public.profiles for select using(id=auth.uid() or exists(select 1 from household_members me join household_members peer using(household_id) where me.user_id=auth.uid() and peer.user_id=profiles.id));
create policy "profile self update" on public.profiles for update using(id=auth.uid()) with check(id=auth.uid());
create policy "members read households" on public.households for select using(is_household_member(id));
create policy "owners update households" on public.households for update using(is_household_owner(id)) with check(is_household_owner(id));
create policy "members read memberships" on public.household_members for select using(is_household_member(household_id));
create policy "owners read invites" on public.household_invites for select using(is_household_owner(household_id));
create policy "owners create invites" on public.household_invites for insert with check(is_household_owner(household_id) and created_by=auth.uid() and expires_at<=now()+interval '7 days');
create policy "visible accounts read" on public.accounts for select using(is_household_member(household_id) and (is_shared or owner_user_id=auth.uid()));
create policy "own accounts create" on public.accounts for insert with check(is_household_member(household_id) and owner_user_id=auth.uid() and not is_shared);
create policy "own accounts update" on public.accounts for update using(owner_user_id=auth.uid()) with check(owner_user_id=auth.uid() and not is_shared);
create policy "categories read" on public.categories for select using(household_id is null or is_household_member(household_id));
create policy "owners create categories" on public.categories for insert with check(household_id is not null and is_household_owner(household_id) and created_by=auth.uid());
create policy "owners update categories" on public.categories for update using(household_id is not null and is_household_owner(household_id));
create policy "transactions visible in household" on public.transactions for select using(is_household_member(household_id) and (privacy='visible' or created_by=auth.uid()));
create policy "transactions own insert" on public.transactions for insert with check(created_by=auth.uid() and is_household_member(household_id));
create policy "transactions own update" on public.transactions for update using(created_by=auth.uid() and is_household_member(household_id)) with check(created_by=auth.uid() and is_household_member(household_id));
create policy "splits visible with transaction" on public.transaction_splits for select using(exists(select 1 from transactions t where t.id=transaction_id));
create policy "own telegram link read" on public.telegram_links for select using(user_id=auth.uid());
create policy "own telegram codes read" on public.telegram_link_codes for select using(user_id=auth.uid());
create policy "own telegram codes create" on public.telegram_link_codes for insert with check(user_id=auth.uid() and expires_at<=now()+interval '10 minutes');
create policy "own telegram codes delete" on public.telegram_link_codes for delete using(user_id=auth.uid());
create policy "own pending actions read" on public.pending_actions for select using(user_id=auth.uid() and is_household_member(household_id));
create policy "own messages read" on public.conversation_messages for select using(user_id=auth.uid() and is_household_member(household_id));
create policy "own audit read" on public.audit_logs for select using(user_id=auth.uid() and is_household_member(household_id));

revoke all on function public.create_household(text) from public; grant execute on function public.create_household(text) to authenticated;
revoke all on function public.join_household(text) from public; grant execute on function public.join_household(text) to authenticated;
revoke all on function public.create_financial_transaction(uuid,uuid,text,bigint,text,uuid,text,text,date,uuid,text) from public;
grant execute on function public.create_financial_transaction(uuid,uuid,text,bigint,text,uuid,text,text,date,uuid,text) to authenticated;
