import { describe, expect, it } from "vitest";
import { mapStripeSubscriptionStatus } from "@/lib/stripe/map-status";

describe("mapStripeSubscriptionStatus", () => {
  it("maps active-like statuses to active", () => {
    expect(mapStripeSubscriptionStatus("active")).toBe("active");
    expect(mapStripeSubscriptionStatus("trialing")).toBe("active");
  });

  it("maps payment-trouble statuses to past_due", () => {
    expect(mapStripeSubscriptionStatus("past_due")).toBe("past_due");
    expect(mapStripeSubscriptionStatus("unpaid")).toBe("past_due");
    expect(mapStripeSubscriptionStatus("incomplete")).toBe("past_due");
  });

  it("maps ended statuses to canceled", () => {
    expect(mapStripeSubscriptionStatus("canceled")).toBe("canceled");
    expect(mapStripeSubscriptionStatus("incomplete_expired")).toBe("canceled");
    expect(mapStripeSubscriptionStatus("paused")).toBe("canceled");
  });

  it("defaults unknown statuses to past_due rather than silently allowing writes", () => {
    expect(mapStripeSubscriptionStatus("some_future_status")).toBe("past_due");
  });
});
