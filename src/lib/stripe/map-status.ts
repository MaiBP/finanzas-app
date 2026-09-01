import type { SubscriptionStatus } from "@/lib/trial/status";

/** Maps a Stripe Subscription's status onto the household's own subscription_status. Extracted
 * as a pure function so the webhook's event handling can be unit-tested without the Stripe SDK. */
export function mapStripeSubscriptionStatus(stripeStatus: string): SubscriptionStatus {
  switch (stripeStatus) {
    case "active":
    case "trialing":
      return "active";
    case "past_due":
    case "unpaid":
    case "incomplete":
      return "past_due";
    case "canceled":
    case "incomplete_expired":
    case "paused":
      return "canceled";
    default:
      return "past_due";
  }
}
