export type SubscriptionStatus = "none" | "trialing" | "active" | "past_due" | "canceled";

export const TRIAL_DAYS = 30;

export type HouseholdTrialFields = {
  subscriptionStatus: SubscriptionStatus;
  trialStartedAt: string | null;
};

export type TrialStatus = HouseholdTrialFields & {
  trialEndsAt: string | null;
  isWritable: boolean;
  daysRemaining: number | null;
};

// Pure mirror of the DB's household_is_writable() function, for rendering only — the RPCs remain
// the actual enforcement point. Kept in lockstep with the SQL in
// supabase/migrations/202608280001_trial_subscription.sql.
export function getHouseholdTrialStatus(household: HouseholdTrialFields, now: Date = new Date()): TrialStatus {
  const { subscriptionStatus, trialStartedAt } = household;

  if (subscriptionStatus === "none" || subscriptionStatus === "active") {
    return { subscriptionStatus, trialStartedAt, trialEndsAt: null, isWritable: true, daysRemaining: null };
  }

  const trialEndsAt = trialStartedAt ? new Date(new Date(trialStartedAt).getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000) : null;

  if (subscriptionStatus === "trialing") {
    const isWritable = !trialEndsAt || now < trialEndsAt;
    const daysRemaining = trialEndsAt ? Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))) : null;
    return { subscriptionStatus, trialStartedAt, trialEndsAt: trialEndsAt?.toISOString() ?? null, isWritable, daysRemaining };
  }

  // past_due, canceled
  return { subscriptionStatus, trialStartedAt, trialEndsAt: trialEndsAt?.toISOString() ?? null, isWritable: false, daysRemaining: 0 };
}
