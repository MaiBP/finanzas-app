-- transactions.description and profiles.display_name are now encrypted at the application layer
-- (AES-256-GCM, base64-encoded) before being written, so the stored value is longer than the
-- plaintext it represents. The original length checks validated plaintext length; that validation
-- still happens in the app (Zod) before encryption, so relaxing these checks does not remove it —
-- it just lets the (longer) ciphertext be stored.

do $$
declare
  existing_constraint text;
begin
  select con.conname into existing_constraint
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_attribute att on att.attrelid = con.conrelid and att.attnum = any(con.conkey)
  where rel.relname = 'transactions' and att.attname = 'description' and con.contype = 'c'
  limit 1;
  if existing_constraint is not null then
    execute format('alter table public.transactions drop constraint %I', existing_constraint);
  end if;
end $$;

alter table public.transactions add constraint transactions_description_check check (char_length(description) between 1 and 500);

do $$
declare
  existing_constraint text;
begin
  select con.conname into existing_constraint
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_attribute att on att.attrelid = con.conrelid and att.attnum = any(con.conkey)
  where rel.relname = 'profiles' and att.attname = 'display_name' and con.contype = 'c'
  limit 1;
  if existing_constraint is not null then
    execute format('alter table public.profiles drop constraint %I', existing_constraint);
  end if;
end $$;

alter table public.profiles add constraint profiles_display_name_check check (display_name is null or char_length(display_name) between 1 and 400);
