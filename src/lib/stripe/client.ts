import Stripe from "stripe";

let cached: Stripe | null = null;

/** Returns null when STRIPE_SECRET_KEY isn't configured yet, so callers can no-op cleanly instead
 * of crashing unrelated functionality before the user has supplied real Stripe keys. */
export function getStripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!cached) cached = new Stripe(key);
  return cached;
}
