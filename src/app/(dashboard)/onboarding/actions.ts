"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/household";

export async function acceptTerms() {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("profiles").update({ terms_accepted_at: new Date().toISOString() }).eq("id", user.id);
  if (error) redirect(`/onboarding?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/onboarding");
}

export async function createHousehold(formData: FormData) {
  const { supabase } = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2 || name.length > 80) redirect("/onboarding?error=El nombre debe tener entre 2 y 80 caracteres");
  const { error } = await supabase.rpc("create_household", { household_name: name });
  if (error) redirect(`/onboarding?error=${encodeURIComponent(error.message)}`);
  redirect("/onboarding/cuenta");
}

export async function joinHousehold(formData: FormData) {
  const { supabase } = await requireUser();
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const { error } = await supabase.rpc("join_household", { invite_code: code });
  if (error) redirect(`/onboarding?error=${encodeURIComponent(error.message)}`);
  redirect("/onboarding/cuenta");
}
