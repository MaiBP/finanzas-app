"use server";
import { redirect } from "next/navigation";
import { generateHouseholdInvite } from "@/app/(dashboard)/app/ajustes/actions";

export async function regenerateInvite() {
  await generateHouseholdInvite();
  redirect("/onboarding/invitar");
}

export async function finishOnboarding() {
  redirect("/app");
}
