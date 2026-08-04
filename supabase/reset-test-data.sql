-- DESTRUCTIVE: removes every registered user and all household/personal finance data.
-- This file is intentionally outside migrations so it can never run during a deploy.
-- Global categories (household_id is null) and the database schema are preserved.

begin;

-- Transactions must be removed while their household still exists because the
-- audit trigger writes one final log entry for each deletion.
delete from public.transactions;
delete from public.audit_logs;

-- Household deletion now cascades to memberships, accounts, invitations,
-- conversations, pending actions and insight deliveries.
delete from public.households;

-- These records belong to users but are not tied directly to a household.
delete from public.telegram_link_codes;
delete from public.telegram_links;

-- Profiles must be removed before deleting their Auth identities.
update public.categories set created_by=null where household_id is null;
delete from public.profiles;
delete from auth.users;

commit;

-- Expected result after the reset: zero in every column.
select
  (select count(*) from auth.users) as auth_users,
  (select count(*) from public.profiles) as profiles,
  (select count(*) from public.households) as households,
  (select count(*) from public.accounts) as accounts,
  (select count(*) from public.transactions) as transactions;
