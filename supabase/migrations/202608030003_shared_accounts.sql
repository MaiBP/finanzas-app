-- Allow household members to create and manage multiple shared funding accounts.
alter table public.accounts drop constraint if exists accounts_type_check;
alter table public.accounts add constraint accounts_type_check
  check(type in ('bank','card','cash','joint','savings','investment'));

drop policy if exists "shared accounts create" on public.accounts;
create policy "shared accounts create" on public.accounts for insert
with check (is_household_member(household_id) and is_shared and owner_user_id is null);

drop policy if exists "shared accounts update" on public.accounts;
create policy "shared accounts update" on public.accounts for update
using (is_household_member(household_id) and is_shared)
with check (is_household_member(household_id) and is_shared and owner_user_id is null);
