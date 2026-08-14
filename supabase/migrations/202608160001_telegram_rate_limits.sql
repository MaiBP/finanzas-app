create table public.telegram_rate_limit_counters (
  telegram_user_id bigint not null,
  bucket text not null,
  window_start timestamptz not null,
  count int not null default 0,
  primary key (telegram_user_id, bucket, window_start)
);

revoke all on public.telegram_rate_limit_counters from public, anon, authenticated;
alter table public.telegram_rate_limit_counters enable row level security;
-- No policies: only service_role (which bypasses RLS) ever touches this table, via the
-- security definer function below and the admin client in the Telegram webhook.

-- Fixed-window counter, atomic per (telegram_user_id, bucket, window_start): concurrent calls
-- for the same user serialize on that row's primary key via ON CONFLICT DO UPDATE, so a burst of
-- simultaneous requests can never all read the same pre-increment count.
create or replace function public.check_telegram_rate_limit(
  p_telegram_user_id bigint,
  p_bucket text,
  p_window_seconds int,
  p_limit int
) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  window_start timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  current_count int;
begin
  insert into telegram_rate_limit_counters (telegram_user_id, bucket, window_start, count)
  values (p_telegram_user_id, p_bucket, window_start, 1)
  on conflict (telegram_user_id, bucket, window_start)
  do update set count = telegram_rate_limit_counters.count + 1
  returning count into current_count;
  return current_count <= p_limit;
end $$;

revoke all on function public.check_telegram_rate_limit(bigint, text, int, int) from public, anon, authenticated;
grant execute on function public.check_telegram_rate_limit(bigint, text, int, int) to service_role;
