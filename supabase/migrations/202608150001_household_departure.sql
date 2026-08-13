alter table public.transactions alter column created_by drop not null;
alter table public.transactions alter column paid_by drop not null;
alter table public.transaction_splits alter column user_id drop not null;

create or replace function public.leave_household() returns void
language plpgsql security definer set search_path = public as $$
declare hid uuid; remaining_count int; remaining_user uuid;
begin
  select household_id into hid from household_members where user_id = auth.uid();
  if hid is null then return; end if; -- no-op: nothing to leave, safe to call unconditionally

  -- Personal data only this user could ever see; once they're not a member, RLS would hide it
  -- forever anyway, so it's removed rather than left orphaned. Order matters: transactions
  -- before accounts (transactions.account_id has no cascade of its own).
  delete from transactions where household_id = hid and scope = 'personal' and created_by = auth.uid();
  delete from accounts where household_id = hid and owner_user_id = auth.uid();
  delete from conversation_messages where household_id = hid and user_id = auth.uid();
  delete from pending_actions where household_id = hid and user_id = auth.uid();
  delete from household_invites where household_id = hid and created_by = auth.uid();

  -- Shared contributions survive — the household keeps its financial history — but are
  -- anonymized. The app displays a null author as "Miembro eliminado".
  update transactions set created_by = null where household_id = hid and created_by = auth.uid();
  update transactions set paid_by = null where household_id = hid and paid_by = auth.uid();
  update transaction_splits set user_id = null
    where user_id = auth.uid() and transaction_id in (select id from transactions where household_id = hid);
  update categories set created_by = null where household_id = hid and created_by = auth.uid();

  delete from household_members where household_id = hid and user_id = auth.uid();

  select count(*) into remaining_count from household_members where household_id = hid;
  if remaining_count = 0 then
    delete from households where id = hid; -- cascades away everything else automatically
  elsif remaining_count = 1 then
    select user_id into remaining_user from household_members where household_id = hid limit 1;
    update household_members set role = 'owner' where household_id = hid and user_id = remaining_user;
    update households set created_by = remaining_user where id = hid;
  end if;
end $$;

revoke all on function public.leave_household() from public;
grant execute on function public.leave_household() to authenticated;
