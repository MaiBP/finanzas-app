import { timingSafeEqual } from "node:crypto";

export function isTimingSafeEqual(received: string | null | undefined, expected: string | undefined) {
  if (!received || !expected) return false;
  const left = Buffer.from(received); const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}
