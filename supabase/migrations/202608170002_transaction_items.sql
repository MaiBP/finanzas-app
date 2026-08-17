-- Line-item detail for a transaction (e.g. individual products from a supermarket receipt).
-- Only the backend (statement-import, via the admin/service-role client) writes these rows —
-- there is no insert policy for `authenticated`, mirroring how transaction_splits is populated
-- exclusively through create_financial_transaction_as_user rather than direct client inserts.
create table public.transaction_items (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  -- description is encrypted at the application layer (see field-encryption.ts), so the stored
  -- length exceeds the plaintext it represents — same relaxed bound as transactions.description.
  description text not null check (char_length(description) between 1 and 500),
  amount_cents bigint not null check (amount_cents > 0),
  subcategory text not null check (char_length(subcategory) between 1 and 60),
  created_at timestamptz not null default now()
);

create index transaction_items_transaction_id_idx on public.transaction_items(transaction_id);

alter table public.transaction_items enable row level security;

-- Same visibility rule as transaction_splits: readable by anyone who can reach the parent
-- transaction row (household membership / privacy is already enforced by that row's own RLS).
create policy "items visible with transaction" on public.transaction_items for select using(exists(select 1 from transactions t where t.id=transaction_id));
