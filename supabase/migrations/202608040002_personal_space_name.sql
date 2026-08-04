-- Give every user a customizable label for their private finance module.
alter table public.profiles
  add column if not exists personal_space_name text not null default 'Mi espacio';

alter table public.profiles drop constraint if exists profiles_personal_space_name_check;
alter table public.profiles add constraint profiles_personal_space_name_check
  check(char_length(trim(personal_space_name)) between 2 and 50);
