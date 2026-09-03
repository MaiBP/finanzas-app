import Link from "next/link";
import type { Metadata } from "next";
import { login } from "../actions";
import { AuthCard } from "@/components/auth/auth-card";
import { Banner } from "@/components/ui/banner";
import { SubmitButton } from "@/components/ui/submit-button";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { PasswordInput } from "@/components/auth/password-input";

export const metadata: Metadata = {
  title: "Entrar",
  description: "Accede a tu cuenta de Miti-Miti para ver el resumen de gastos e ingresos de tu hogar.",
  alternates: { canonical: "/login" },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string; code?: string }>;
}) {
  const params = await searchParams;
  return (
    <AuthCard
      tone="blue"
      title="Qué gusto verte"
      subtitle="Entra y mira cómo va tu mes."
      footer={
        <>
          ¿Primera vez?{" "}
          <Link className="font-bold text-(--ink)" href={params.code ? `/registro?code=${encodeURIComponent(params.code)}` : "/registro"}>
            Crea una cuenta
          </Link>
        </>
      }
    >
      <Banner kind="error">{params.error}</Banner>
      <Banner kind="success">{params.message}</Banner>
      {params.code && (
        <Banner kind="success">Te invitaron a un hogar. Iniciá sesión para unirte con el código {params.code}.</Banner>
      )}
      <GoogleSignInButton />
      <div className="my-5 flex items-center gap-3 text-xs font-bold uppercase text-(--muted)">
        <span className="h-px flex-1 bg-(--ink)/20" />
        o entra con email
        <span className="h-px flex-1 bg-(--ink)/20" />
      </div>
      <form action={login} className="space-y-5">
        {params.code && <input type="hidden" name="code" value={params.code} />}
        <label>
          <span className="label">Email</span>
          <input className="field" required type="email" name="email" autoComplete="email" />
        </label>
        <div>
          <label htmlFor="login-password" className="label">
            Contraseña
          </label>
          <PasswordInput id="login-password" autoComplete="current-password" />
        </div>
        <div className="text-right">
          <Link href="/recuperar" className="text-sm font-bold text-(--ink)">
            He olvidado la contraseña
          </Link>
        </div>
        <SubmitButton pendingText="Entrando…">Entrar</SubmitButton>
      </form>
    </AuthCard>
  );
}
