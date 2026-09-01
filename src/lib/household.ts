import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { SubscriptionStatus } from "@/lib/trial/status";

export async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export async function getCurrentHousehold() {
  const { supabase, user } = await requireUser();
  const { data } = await supabase.from("household_members").select("household_id, role, households(id, name, base_currency, subscription_status, trial_started_at)").eq("user_id", user.id).maybeSingle();
  if (!data) return { supabase, user, household: null };
  const relation = data.households as unknown as { id: string; name: string; base_currency: string; subscription_status: SubscriptionStatus; trial_started_at: string | null };
  return {
    supabase,
    user,
    household: {
      id: relation.id,
      name: relation.name,
      role: data.role as "owner" | "member",
      baseCurrency: relation.base_currency,
      subscriptionStatus: relation.subscription_status,
      trialStartedAt: relation.trial_started_at,
    },
  };
}
