"use server";
import { redirect } from "next/navigation";
import { createAccount, createSharedAccount } from "@/app/(dashboard)/app/cuentas/actions";
import { updateHouseholdBaseCurrency } from "@/app/(dashboard)/app/ajustes/actions";
import { getCurrentHousehold } from "@/lib/household";

export async function createFirstAccount(formData: FormData) {
  // scope only appears on the form when a joining member's partner already has a shared account
  // (see the page) — absent, this is the classic "create the household's first account" path and
  // defaults to shared, same as before that choice existed.
  if (formData.get("scope") === "personal") {
    await createAccount(formData);
    redirect("/onboarding/canal");
  }
  await createSharedAccount(formData);
  // The household's base currency (used for dashboard/balance summaries) otherwise stays on its
  // silent EUR default forever unless someone visits Ajustes later — syncing it here to whatever
  // was just picked for this shared account avoids that. Owner-only, same restriction
  // updateHouseholdBaseCurrency already enforces; doesn't apply to the personal branch above, since
  // a personal account's currency has no bearing on the household's shared summaries.
  const { household } = await getCurrentHousehold();
  if (household?.role === "owner") await updateHouseholdBaseCurrency(formData);
  redirect("/onboarding/canal");
}
