import Link from "next/link";
import { login } from "../actions";
import { AuthCard } from "@/components/auth/auth-card";
import { SubmitButton } from "@/components/ui/submit-button";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  const params = await searchParams;
  return <AuthCard title="Qué gusto verte" subtitle="Entra y mira cómo va vuestro mes." footer={<>¿Primera vez? <Link className="font-bold text-[#26725c]" href="/registro">Crea una cuenta</Link></>}>
    {params.error && <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{params.error}</p>}
    {params.message && <p className="mb-4 rounded-xl bg-green-50 p-3 text-sm text-green-800">{params.message}</p>}
    <form action={login} className="space-y-4"><label><span className="label">Email</span><input className="field" required type="email" name="email" autoComplete="email"/></label><label><span className="label">Contraseña</span><input className="field" required type="password" name="password" autoComplete="current-password"/></label><div className="text-right"><Link href="/recuperar" className="text-sm font-bold text-[#26725c]">He olvidado la contraseña</Link></div><SubmitButton pendingText="Entrando…">Entrar</SubmitButton></form>
  </AuthCard>;
}
