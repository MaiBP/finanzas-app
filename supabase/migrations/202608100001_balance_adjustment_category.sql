insert into public.categories (household_id, name, kind) values
  (null, 'Ajuste de saldo', 'income'),
  (null, 'Ajuste de saldo', 'expense')
on conflict do nothing;
