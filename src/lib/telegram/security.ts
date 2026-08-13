import { isTimingSafeEqual } from "@/lib/security/timing-safe";

export function isValidWebhookSecret(received: string | null, expected: string | undefined) {
  return isTimingSafeEqual(received, expected);
}
