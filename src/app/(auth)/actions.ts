"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function safeMessage(value: unknown) { return encodeURIComponent(value instanceof Error ? value.message : "No se pudo completar la acción"); }

export async function login(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: String(formData.get("email")), password: String(formData.get("password")) });
  if (error) redirect(`/login?error=${safeMessage("Email o contraseña incorrectos")}`);
  redirect("/app");
}

export async function signup(formData: FormData) {
  const supabase = await createClient();
  const email = String(formData.get("email"));
  const password = String(formData.get("password"));
  const displayName = String(formData.get("displayName"));
  if (password.length < 8) redirect(`/registro?error=${safeMessage("La contraseña debe tener al menos 8 caracteres")}`);
  const { error } = await supabase.auth.signUp({ email, password, options: { data: { display_name: displayName } } });
  if (error) redirect(`/registro?error=${safeMessage(error)}`);
  redirect("/login?message=Revisa tu email para confirmar la cuenta");
}

export async function requestPasswordReset(formData: FormData) {
  const supabase = await createClient();
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const { error } = await supabase.auth.resetPasswordForEmail(String(formData.get("email")), { redirectTo: `${origin}/auth/callback?next=/app/ajustes` });
  if (error) redirect(`/recuperar?error=${safeMessage(error)}`);
  redirect("/login?message=Te hemos enviado un enlace de recuperación");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
