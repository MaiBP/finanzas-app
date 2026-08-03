import { timingSafeEqual } from "node:crypto";

export function isValidWebhookSecret(received: string | null, expected: string | undefined) {
  if (!received || !expected) return false;
  const left = Buffer.from(received); const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}
