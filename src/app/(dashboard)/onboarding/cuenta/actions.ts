"use server";
import { redirect } from "next/navigation";
import { createSharedAccount } from "@/app/(dashboard)/app/cuentas/actions";

export async function createFirstAccount(formData: FormData) {
  await createSharedAccount(formData);
  redirect("/onboarding/canal");
}
