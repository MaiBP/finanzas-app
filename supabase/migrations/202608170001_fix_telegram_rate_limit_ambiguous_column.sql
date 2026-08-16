-- The plpgsql variable `window_start` shared its name with the table column of the same name,
-- which Postgres treats as an ambiguous reference (42702) inside the INSERT/ON CONFLICT/RETURNING
-- body — this made every call to the function fail, blocking every Telegram message. Fixed by
-- prefixing the local variables so they can't collide with column names.
create or replace function public.check_telegram_rate_limit(
  p_telegram_user_id bigint,
  p_bucket text,
  p_window_seconds int,
  p_limit int
) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_window_start timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_current_count int;
begin
  insert into telegram_rate_limit_counters (telegram_user_id, bucket, window_start, count)
  values (p_telegram_user_id, p_bucket, v_window_start, 1)
  on conflict (telegram_user_id, bucket, window_start)
  do update set count = telegram_rate_limit_counters.count + 1
  returning count into v_current_count;
  return v_current_count <= p_limit;
end $$;
