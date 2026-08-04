-- Track proactive financial insights so Telegram never repeats the same notification.
create table public.financial_insight_deliveries (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  insight_key text not null check(char_length(insight_key) between 3 and 200),
  channel text not null default 'telegram' check(channel in ('telegram')),
  status text not null default 'pending' check(status in ('pending','sent')),
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  unique(user_id,channel,insight_key)
);

create index financial_insight_deliveries_household_idx
  on public.financial_insight_deliveries(household_id,created_at desc);

alter table public.financial_insight_deliveries enable row level security;
-- Deliberately no client policies: only server-side jobs using SUPABASE_SECRET_KEY may access this table.
