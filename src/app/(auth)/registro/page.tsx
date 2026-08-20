import Link from "next/link";
import { signup } from "../actions";
import { AuthCard } from "@/components/auth/auth-card";
import { Banner } from "@/components/ui/banner";
import { SubmitButton } from "@/components/ui/submit-button";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { PasswordInput } from "@/components/auth/password-input";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <AuthCard
      tone="lime"
      title="Empezamos"
      subtitle="Tu cuenta es personal; después crearás o te unirás a un hogar."
      footer={
        <>
          ¿Ya tienes cuenta?{" "}
          <Link className="font-bold text-(--ink)" href="/login">
            Entra aquí
          </Link>
        </>
      }
    >
      <Banner kind="error">{error}</Banner>
      <GoogleSignInButton />
      <div className="my-5 flex items-center gap-3 text-xs font-bold uppercase text-(--muted)">
        <span className="h-px flex-1 bg-(--ink)/20" />
        o crea la cuenta con email
        <span className="h-px flex-1 bg-(--ink)/20" />
      </div>
      <form action={signup} className="space-y-5">
        <label>
          <span className="label">Cómo te llamas</span>
          <input className="field" required name="displayName" maxLength={60} autoComplete="name" />
        </label>
        <label>
          <span className="label">Email</span>
          <input className="field" required type="email" name="email" autoComplete="email" />
        </label>
        <div>
          <label htmlFor="signup-password" className="label">
            Contraseña
          </label>
          <PasswordInput id="signup-password" autoComplete="new-password" minLength={8} />
          <small className="mt-1 block text-(--muted)">Mínimo 8 caracteres</small>
        </div>
        <SubmitButton pendingText="Creando…">Crear mi cuenta</SubmitButton>
      </form>
    </AuthCard>
  );
}
