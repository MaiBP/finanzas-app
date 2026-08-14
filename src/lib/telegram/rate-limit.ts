import type { createAdminClient } from "@/lib/supabase/admin";

export const MAX_VOICE_DURATION_SECONDS = 120;

type Bucket = readonly [name: string, windowSeconds: number, limit: number];

// Generous starting points — the goal is a hard ceiling before any OpenAI call, not a tight
// throttle. Tighten once real usage is measured.
const MESSAGE_BUCKETS: readonly Bucket[] = [
  ["msg_min", 60, 10],
  ["msg_hour", 3600, 100],
  ["msg_day", 86400, 300],
];
const VOICE_HOURLY_BUCKET: Bucket = ["voice_hour", 3600, 20];

async function checkBucket(db: ReturnType<typeof createAdminClient>, telegramUserId: number, [bucket, windowSeconds, limit]: Bucket) {
  const { data, error } = await db.rpc("check_telegram_rate_limit", {
    p_telegram_user_id: telegramUserId,
    p_bucket: bucket,
    p_window_seconds: windowSeconds,
    p_limit: limit,
  });
  if (error) throw error;
  return data as boolean;
}

export async function checkTelegramMessageRateLimit(db: ReturnType<typeof createAdminClient>, telegramUserId: number) {
  for (const bucket of MESSAGE_BUCKETS) {
    if (!(await checkBucket(db, telegramUserId, bucket))) return false;
  }
  return true;
}

export async function checkTelegramVoiceRateLimit(db: ReturnType<typeof createAdminClient>, telegramUserId: number) {
  return checkBucket(db, telegramUserId, VOICE_HOURLY_BUCKET);
}
