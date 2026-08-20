-- Mirrors audit_transaction_change so account lifecycle changes (created, archived, restored)
-- land in the existing audit_logs table too — nothing previously wrote to it for accounts.
create or replace function public.audit_account_change() returns trigger language plpgsql security definer set search_path=public as $$
declare audit_action text; actor uuid;
begin
  actor:=auth.uid();
  if tg_op='INSERT' then audit_action:='created';
  elsif old.archived_at is null and new.archived_at is not null then audit_action:='deleted';
  elsif old.archived_at is not null and new.archived_at is null then audit_action:='restored';
  else audit_action:='updated'; end if;
  insert into audit_logs(user_id,household_id,entity_type,entity_id,action,old_values,new_values,source)
  values(actor,coalesce(new.household_id,old.household_id),'account',coalesce(new.id,old.id),audit_action,
    case when tg_op='INSERT' then null else to_jsonb(old) end,case when tg_op='DELETE' then null else to_jsonb(new) end,'web');
  return coalesce(new,old);
end $$;
create trigger audit_accounts after insert or update or delete on public.accounts for each row execute function public.audit_account_change();

-- The existing "own audit read" policy only lets a user read their own actions, which is right
-- for personal/private entities but too narrow for a shared account: if one partner archives a
-- shared account, the other should still see that note in Movimientos, not just the actor. Scope
-- this additional policy narrowly to account rows that are actually shared.
create policy "shared account audit read" on public.audit_logs for select using (
  entity_type='account' and is_household_member(household_id)
  and exists(select 1 from accounts where accounts.id=audit_logs.entity_id and accounts.is_shared=true)
);
