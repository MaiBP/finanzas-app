"use server";
import { redirect } from "next/navigation";
import { createSharedAccount } from "@/app/(dashboard)/app/cuentas/actions";
import { updateHouseholdBaseCurrency } from "@/app/(dashboard)/app/ajustes/actions";
import { getCurrentHousehold } from "@/lib/household";

export async function createFirstAccount(formData: FormData) {
  await createSharedAccount(formData);
  // The household's base currency (used for dashboard/balance summaries) otherwise stays on its
  // silent EUR default forever unless someone visits Ajustes later — syncing it here to whatever
  // was just picked for the first account avoids that. Owner-only, same restriction
  // updateHouseholdBaseCurrency already enforces: a joining member reaching this same step still
  // gets their own account in their chosen currency, it just doesn't also override the household
  // default the owner may have already set.
  const { household } = await getCurrentHousehold();
  if (household?.role === "owner") await updateHouseholdBaseCurrency(formData);
  redirect("/onboarding/canal");
}
