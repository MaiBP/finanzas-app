import { describe, expect, it } from "vitest";
import { getHouseholdTrialStatus } from "@/lib/trial/status";

describe("getHouseholdTrialStatus", () => {
  it("is writable and open-ended before any transaction has ever been made", () => {
    const status = getHouseholdTrialStatus({ subscriptionStatus: "none", trialStartedAt: null });
    expect(status.isWritable).toBe(true);
    expect(status.daysRemaining).toBeNull();
  });

  it("is writable during an active subscription regardless of trial dates", () => {
    const status = getHouseholdTrialStatus({ subscriptionStatus: "active", trialStartedAt: "2020-01-01T00:00:00Z" });
    expect(status.isWritable).toBe(true);
  });

  it("is writable and counts down within the 30-day trial window", () => {
    const now = new Date("2026-08-21T00:00:00Z");
    const status = getHouseholdTrialStatus({ subscriptionStatus: "trialing", trialStartedAt: "2026-08-01T00:00:00Z" }, now);
    expect(status.isWritable).toBe(true);
    expect(status.daysRemaining).toBe(10);
  });

  it("stops being writable once the 30 days have elapsed", () => {
    const now = new Date("2026-08-31T01:00:00Z");
    const status = getHouseholdTrialStatus({ subscriptionStatus: "trialing", trialStartedAt: "2026-08-01T00:00:00Z" }, now);
    expect(status.isWritable).toBe(false);
    expect(status.daysRemaining).toBe(0);
  });

  it("is never writable when past_due or canceled", () => {
    expect(getHouseholdTrialStatus({ subscriptionStatus: "past_due", trialStartedAt: "2026-08-01T00:00:00Z" }).isWritable).toBe(false);
    expect(getHouseholdTrialStatus({ subscriptionStatus: "canceled", trialStartedAt: "2026-08-01T00:00:00Z" }).isWritable).toBe(false);
  });
});
