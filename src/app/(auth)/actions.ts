"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureDisplayNameEncrypted } from "@/lib/security/field-encryption";

// A bare string here is always a message we authored ourselves (safe to show verbatim); only an
// Error falls back through its own .message, since that's the one case the caller didn't write the
// text itself.
function safeMessage(value: unknown) { return encodeURIComponent(value instanceof Error ? value.message : typeof value === "string" ? value : "No se pudo completar la acción"); }

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
  const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { display_name: displayName } } });
  if (error) redirect(`/registro?error=${safeMessage(error)}`);
  // Supabase never errors signUp for an email that's already registered (anti-enumeration) — it
  // silently returns the existing user with an empty identities list instead of creating a new one
  // or sending another confirmation email, so that's the one signal available to tell them apart.
  if (data.user && data.user.identities?.length === 0) redirect(`/registro?error=${safeMessage("Ya existe una cuenta con ese email. Intenta iniciar sesión.")}`);
  if (data.user) await ensureDisplayNameEncrypted(data.user.id);
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
