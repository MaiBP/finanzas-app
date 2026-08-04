import Link from "next/link";
import { signup } from "../actions";
import { AuthCard } from "@/components/auth/auth-card";
import { SubmitButton } from "@/components/ui/submit-button";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { PasswordInput } from "@/components/auth/password-input";

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <AuthCard tone="lime" title="Empezamos" subtitle="Tu cuenta es personal; después crearás o te unirás a un hogar." footer={<>¿Ya tienes cuenta? <Link className="font-bold text-[#26725c]" href="/login">Entra aquí</Link></>}>
    {error && <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <GoogleSignInButton/><div className="my-5 flex items-center gap-3 text-xs font-bold uppercase text-[#6c7f7a]"><span className="h-px flex-1 bg-[#3a3434]/20"/>o crea la cuenta con email<span className="h-px flex-1 bg-[#3a3434]/20"/></div>
    <form action={signup} className="space-y-4"><label><span className="label">Cómo te llamas</span><input className="field" required name="displayName" maxLength={60} autoComplete="name"/></label><label><span className="label">Email</span><input className="field" required type="email" name="email" autoComplete="email"/></label><div><label htmlFor="signup-password" className="label">Contraseña</label><PasswordInput id="signup-password" autoComplete="new-password" minLength={8}/><small className="mt-1 block text-[#6c7f7a]">Mínimo 8 caracteres</small></div><SubmitButton pendingText="Creando…">Crear mi cuenta</SubmitButton></form>
  </AuthCard>;
}
