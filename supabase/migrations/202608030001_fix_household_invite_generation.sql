-- Supabase installs pgcrypto under the extensions schema. create_household
-- intentionally uses a restricted search_path, so extension functions must be
-- schema-qualified.
create extension if not exists pgcrypto with schema extensions;

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
  invite := upper(substr(encode(extensions.gen_random_bytes(6),'hex'),1,8));
  insert into household_invites(household_id,code,created_by,expires_at) values(hid,invite,auth.uid(),now()+interval '7 days');
  return hid;
end $$;

revoke all on function public.create_household(text) from public;
grant execute on function public.create_household(text) to authenticated;
