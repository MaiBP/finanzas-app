import { Resend } from "resend";

let cached: Resend | null = null;

/** Returns null when RESEND_API_KEY isn't configured yet, so callers can skip sending instead of
 * crashing unrelated functionality before the user has supplied a real key. */
export function getResendClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (!cached) cached = new Resend(key);
  return cached;
}
