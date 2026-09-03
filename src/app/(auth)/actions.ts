"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureDisplayNameEncrypted } from "@/lib/security/field-encryption";
import { getAppUrl } from "@/lib/env";

// A bare string here is always a message we authored ourselves (safe to show verbatim); only an
// Error falls back through its own .message, since that's the one case the caller didn't write the
// text itself.
function safeMessage(value: unknown) { return encodeURIComponent(value instanceof Error ? value.message : typeof value === "string" ? value : "No se pudo completar la acción"); }

export async function login(formData: FormData) {
  const supabase = await createClient();
  const code = formData.get("code");
  const codeParam = typeof code === "string" && code ? `&code=${encodeURIComponent(code)}` : "";
  const { error } = await supabase.auth.signInWithPassword({ email: String(formData.get("email")), password: String(formData.get("password")) });
  if (error) redirect(`/login?error=${safeMessage("Email o contraseña incorrectos")}${codeParam}`);
  redirect(typeof code === "string" && code ? `/onboarding?code=${encodeURIComponent(code)}` : "/app");
}

export async function signup(formData: FormData) {
  const supabase = await createClient();
  const email = String(formData.get("email"));
  const password = String(formData.get("password"));
  const displayName = String(formData.get("displayName"));
  if (password.length < 8) redirect(`/registro?error=${safeMessage("La contraseña debe tener al menos 8 caracteres")}`);
  // type=signup here is our own marker, read back by /auth/callback to skip creating a session for
  // this one flow — after confirming, the user should log in themselves rather than land already
  // authenticated just because they clicked a link in their inbox.
  const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { display_name: displayName }, emailRedirectTo: `${getAppUrl()}/auth/callback?type=signup` } });
  if (error) redirect(`/registro?error=${safeMessage(error)}`);
  // Supabase never errors signUp for an email that's already registered (anti-enumeration) — it
  // silently returns the existing user with an empty identities list instead of creating a new one
  // or sending another confirmation email, so that's the one signal available to tell them apart.
  if (data.user && data.user.identities?.length === 0) redirect(`/registro?error=${safeMessage("Ya existe una cuenta con ese email. Intenta iniciar sesión.")}`);
  if (data.user) await ensureDisplayNameEncrypted(data.user.id);
  redirect(`/login?message=${safeMessage("Revisa tu email para confirmar la cuenta (si no lo ves, revisá también spam o correo no deseado)")}`);
}

export async function requestPasswordReset(formData: FormData) {
  const supabase = await createClient();
  const origin = getAppUrl();
  const { error } = await supabase.auth.resetPasswordForEmail(String(formData.get("email")), { redirectTo: `${origin}/auth/callback?next=/app/ajustes` });
  if (error) redirect(`/recuperar?error=${safeMessage(error)}`);
  redirect(`/login?message=${safeMessage("Te hemos enviado un enlace de recuperación (si no lo ves, revisá también spam o correo no deseado)")}`);
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
