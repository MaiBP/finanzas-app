import Link from "next/link";
import type { Metadata } from "next";
import { requestPasswordReset } from "../actions";
import { AuthCard } from "@/components/auth/auth-card";
import { Banner } from "@/components/ui/banner";
import { SubmitButton } from "@/components/ui/submit-button";

export const metadata: Metadata = {
  title: "Recuperar contraseña",
  description: "Recupera el acceso a tu cuenta de Miti-Miti si olvidaste tu contraseña.",
  alternates: { canonical: "/recuperar" },
};

export default async function ResetPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <AuthCard
      tone="lilac"
      title="Recupera el acceso"
      subtitle="Te enviaremos un enlace seguro por email."
      footer={
        <Link className="font-bold text-(--ink)" href="/login">
          Volver a entrar
        </Link>
      }
    >
      <Banner kind="error">{error}</Banner>
      <form action={requestPasswordReset} className="space-y-5">
        <label>
          <span className="label">Email</span>
          <input className="field" required type="email" name="email" />
        </label>
        <SubmitButton pendingText="Enviando…">Enviar enlace</SubmitButton>
      </form>
    </AuthCard>
  );
}
