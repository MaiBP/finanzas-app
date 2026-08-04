import Link from "next/link";
import { login } from "../actions";
import { AuthCard } from "@/components/auth/auth-card";
import { SubmitButton } from "@/components/ui/submit-button";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { PasswordInput } from "@/components/auth/password-input";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  const params = await searchParams;
  return <AuthCard tone="blue" title="Qué gusto verte" subtitle="Entra y mira cómo va vuestro mes." footer={<>¿Primera vez? <Link className="font-bold text-[#26725c]" href="/registro">Crea una cuenta</Link></>}>
    {params.error && <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{params.error}</p>}
    {params.message && <p className="mb-4 rounded-xl bg-green-50 p-3 text-sm text-green-800">{params.message}</p>}
    <GoogleSignInButton/><div className="my-5 flex items-center gap-3 text-xs font-bold uppercase text-[#6c7f7a]"><span className="h-px flex-1 bg-[#3a3434]/20"/>o entra con email<span className="h-px flex-1 bg-[#3a3434]/20"/></div>
    <form action={login} className="space-y-4"><label><span className="label">Email</span><input className="field" required type="email" name="email" autoComplete="email"/></label><div><label htmlFor="login-password" className="label">Contraseña</label><PasswordInput id="login-password" autoComplete="current-password"/></div><div className="text-right"><Link href="/recuperar" className="text-sm font-bold text-[#26725c]">He olvidado la contraseña</Link></div><SubmitButton pendingText="Entrando…">Entrar</SubmitButton></form>
  </AuthCard>;
}
