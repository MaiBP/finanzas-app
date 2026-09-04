-- Records the household's shared balance at the end of each calendar month, purely as a
-- read-only historical note ("¿con qué saldo cerramos agosto?") — it never feeds back into any
-- balance calculation. One row per household per month, keyed by the actual closing date (the
-- last day of that month) so a rerun of the cron the same day just replaces the row instead of
-- duplicating it.
create table public.month_closing_snapshots (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  closing_date date not null,
  base_currency char(3) not null,
  total_balance_cents bigint not null,
  -- One entry per active shared account at closing time: {id,name,type,currency,balance_cents}.
  -- Kept even for accounts in a currency other than base_currency (excluded from the total for the
  -- same reason the dashboard/Cuentas totals exclude them — mixing currencies in one sum would be
  -- meaningless), so the full per-account detail is still there if asked about later.
  account_breakdown jsonb not null,
  created_at timestamptz not null default now(),
  unique(household_id, closing_date)
);
create index month_closing_snapshots_household_idx on public.month_closing_snapshots(household_id, closing_date desc);

alter table public.month_closing_snapshots enable row level security;
create policy "members read month closings" on public.month_closing_snapshots for select using (is_household_member(household_id));
-- Only the cron (service role, bypasses RLS) ever writes here — no insert/update policy for
-- authenticated users.
