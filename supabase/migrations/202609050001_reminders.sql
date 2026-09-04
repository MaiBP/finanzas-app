-- Lets a user tell Piggy about a recurring or one-off payment reminder ("recordame pagar el
-- alquiler el día 5", "avisame cuando se descuente la luz") and get notified by the
-- reminder-notifications cron on the right day, without it ever touching real money — a reminder
-- is purely a note, never a transaction.
create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  description text not null check (char_length(description) between 1 and 500), -- encrypted at rest (field-encryption), like transactions.description
  scope text not null check (scope in ('personal','shared')),
  is_recurring boolean not null default true,
  day_of_month int check (day_of_month between 1 and 31),
  reminder_date date,
  remind_days_before int not null default 0 check (remind_days_before between 0 and 10),
  amount_cents bigint check (amount_cents > 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check (
    (is_recurring and day_of_month is not null and reminder_date is null)
    or (not is_recurring and reminder_date is not null and day_of_month is null)
  )
);
create index reminders_household_active_idx on public.reminders(household_id) where active;

alter table public.reminders enable row level security;
-- Same visibility rule as transactions: a shared reminder is visible to the whole household, a
-- personal one only to whoever created it.
create policy "read own or shared active reminders" on public.reminders for select using (
  is_household_member(household_id) and (scope = 'shared' or created_by = auth.uid())
);
create policy "members create reminders" on public.reminders for insert with check (
  is_household_member(household_id) and created_by = auth.uid()
);
-- Only the creator can deactivate/delete their own reminder, even a shared one — mirrors how
-- transactions.created_by controls edit/delete rather than any household member being able to.
create policy "creator manages own reminders" on public.reminders for update using (created_by = auth.uid()) with check (created_by = auth.uid());
create policy "creator deletes own reminders" on public.reminders for delete using (created_by = auth.uid());

-- Dedup ledger for the daily cron, same insert-once-per-day idea as financial_insight_deliveries —
-- only the cron (service role) ever touches this, no policies needed for authenticated users.
create table public.reminder_deliveries (
  id uuid primary key default gen_random_uuid(),
  reminder_id uuid not null references public.reminders(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  delivery_date date not null,
  created_at timestamptz not null default now(),
  unique(reminder_id, user_id, delivery_date)
);
alter table public.reminder_deliveries enable row level security;
