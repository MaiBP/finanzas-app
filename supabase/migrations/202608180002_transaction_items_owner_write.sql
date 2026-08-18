-- The web edit page now lets the transaction's owner rewrite its product breakdown directly from
-- their own (RLS-scoped, non-admin) session — previously only the service-role client ever wrote
-- to transaction_items (via statement-import / Telegram). Scoped to the transaction's creator,
-- mirroring "transactions own update".
create policy "own transaction items insert" on public.transaction_items for insert
  with check (exists (select 1 from transactions t where t.id = transaction_id and t.created_by = auth.uid()));

create policy "own transaction items delete" on public.transaction_items for delete
  using (exists (select 1 from transactions t where t.id = transaction_id and t.created_by = auth.uid()));
