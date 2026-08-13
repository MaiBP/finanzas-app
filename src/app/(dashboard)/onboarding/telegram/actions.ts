"use server";
import { redirect } from "next/navigation";
import { generateTelegramCode } from "@/app/(dashboard)/app/ajustes/actions";
import { getCurrentHousehold } from "@/lib/household";

export async function generateAndShowCode() {
  await generateTelegramCode();
  redirect("/onboarding/telegram");
}

export async function continueFromTelegram() {
  const { supabase, household } = await getCurrentHousehold();
  if (household?.role === "owner") {
    const { data: invite } = await supabase
      .from("household_invites")
      .select("id")
      .eq("household_id", household.id)
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString())
      .limit(1)
      .maybeSingle();
    if (invite) redirect("/onboarding/invitar");
  }
  redirect("/app");
}
