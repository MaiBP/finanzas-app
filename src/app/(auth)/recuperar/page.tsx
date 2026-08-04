import Link from "next/link";
import { requestPasswordReset } from "../actions";
import { AuthCard } from "@/components/auth/auth-card";
import { SubmitButton } from "@/components/ui/submit-button";

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) { const { error } = await searchParams; return <AuthCard tone="lilac" title="Recupera el acceso" subtitle="Te enviaremos un enlace seguro por email." footer={<Link className="font-bold text-[#26725c]" href="/login">Volver a entrar</Link>}>{error && <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}<form action={requestPasswordReset} className="space-y-4"><label><span className="label">Email</span><input className="field" required type="email" name="email"/></label><SubmitButton pendingText="Enviando…">Enviar enlace</SubmitButton></form></AuthCard>; }
