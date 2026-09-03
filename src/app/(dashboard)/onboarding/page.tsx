import Image from "next/image";
import type { Metadata } from "next";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentHousehold } from "@/lib/household";
import { SubmitButton } from "@/components/ui/submit-button";
import { Banner } from "@/components/ui/banner";
import { FadeIn, FloatBlob } from "@/components/ui/motion";
import { StepIndicator } from "@/components/onboarding/step-indicator";
import { TermsAcceptForm } from "@/components/onboarding/terms-accept-form";
import { acceptTerms, createHousehold, joinHousehold } from "./actions";

export const metadata: Metadata = {
  title: "Primeros pasos",
  robots: { index: false, follow: false },
};

export default async function Onboarding({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; code?: string }>;
}) {
  const { supabase, user, household } = await getCurrentHousehold();
  if (household) redirect("/app");
  const { error, code } = await searchParams;
  const { data: profile } = await supabase.from("profiles").select("terms_accepted_at").eq("id", user.id).maybeSingle();

  if (!profile?.terms_accepted_at) {
    return (
      <main className="relative min-h-screen overflow-hidden px-5 py-10 md:py-14">
        <FloatBlob className="absolute -left-20 top-1/3 size-56 rounded-full bg-(--blue)/80" />
        <FloatBlob className="absolute -right-24 top-12 size-64 rounded-full bg-(--lilac)/75" />
        <div className="relative z-10 mx-auto max-w-xl">
          <StepIndicator step={1} total={6} label="Términos" />
          <FadeIn className="text-center">
            <Image src="/logo-mitimiti.png" alt="Miti-Miti" width={72} height={72} className="mx-auto size-18 object-contain" />
            <p className="mx-auto mt-5 w-fit bg-(--highlight) px-2 text-xs font-black uppercase tracking-wider">
              Antes de empezar
            </p>
            <h1 className="mt-4 text-4xl font-black tracking-tight md:text-5xl">Tu privacidad, cuidada en serio</h1>
          </FadeIn>
          <FadeIn delay={0.05} className="card mt-8 p-7">
            <div className="flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-(--lime)">
                <ShieldCheck size={20} />
              </span>
              <p className="text-sm font-bold">Antes de continuar, esto es lo que hacemos con tu información:</p>
            </div>
            <ul className="mt-5 space-y-3 text-sm text-(--ink)/85">
              <li>🔒 Tu nombre, tus movimientos y tu conversación con el asistente se guardan cifrados.</li>
              <li>🙈 Nunca vendemos ni compartimos tu información con terceros.</li>
              <li>🤖 La inteligencia artificial nunca recibe tu nombre real ni el de tu pareja: solo importes y categorías.</li>
              <li>🗂️ Tu espacio personal es privado; tu pareja nunca puede verlo.</li>
              <li>🗑️ Podés pedirnos eliminar tu cuenta y tus datos cuando quieras.</li>
            </ul>
            <div className="mt-6 border-t border-(--ink)/15 pt-6">
              <TermsAcceptForm action={acceptTerms} />
            </div>
          </FadeIn>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden px-5 py-10 md:py-14">
      <FloatBlob className="absolute -left-20 top-1/3 size-56 rounded-full bg-(--blue)/80" />
      <FloatBlob className="absolute -right-24 top-12 size-64 rounded-full bg-(--lilac)/75" />

      <div className="relative z-10 mx-auto max-w-5xl">
        <StepIndicator step={2} total={6} label="Hogar" />
        <FadeIn className="text-center">
          <Image src="/logo-mitimiti.png" alt="Miti-Miti" width={72} height={72} className="mx-auto size-18 object-contain" />
          <p className="mx-auto mt-5 w-fit bg-(--highlight) px-2 text-xs font-black uppercase tracking-wider">
            Bienvenidos a Miti-Miti
          </p>
          <h1 className="mt-4 text-4xl font-black tracking-tight md:text-5xl">¿Dónde organizamos las cuentas?</h1>
          <p className="mx-auto mt-3 max-w-xl text-(--ink)/75">
            Crea un hogar para empezar desde cero o entra al espacio que tu pareja ya preparó.
          </p>
        </FadeIn>

        <div className="mx-auto mt-6 max-w-xl">
          <Banner kind="error">{error}</Banner>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <div className="relative">
            <Image
              src="/home.png"
              alt=""
              width={112}
              height={112}
              className="absolute -top-6 -left-5 z-1 size-16 -rotate-6 object-contain drop-shadow-[3px_3px_0_rgba(58,52,52,0.18)] sm:-top-7 sm:-left-6 sm:size-20"
            />
            <FadeIn delay={0.05} className="card overflow-hidden bg-(--blue)">
            <div className="flex items-center justify-between border-b border-(--ink)/20 p-6">
              <span className="size-12" />
              <span className="text-5xl font-black text-(--ink)/20">01</span>
            </div>
            <div className="p-7">
              <p className="w-fit bg-(--highlight) px-1 text-xs font-black uppercase">Nuevo espacio compartido</p>
              <h2 className="mt-3 text-2xl font-black">Crear un hogar</h2>
              <p className="mt-2 min-h-12 text-sm text-(--ink)/75">
                Serás la persona propietaria y podrás invitar a quien quieras.
              </p>
              <form action={createHousehold} className="mt-6 space-y-7">
                <label>
                  <span className="label text-(--ink)!">Nombre del hogar</span>
                  <input
                    className="field"
                    name="name"
                    required
                    minLength={2}
                    maxLength={80}
                    placeholder="Casa de Maira y Cristian"
                  />
                </label>
                <SubmitButton>Crear hogar</SubmitButton>
              </form>
            </div>
            </FadeIn>
          </div>

          <div className="relative">
            <Image
              src="/hand-shake.png"
              alt=""
              width={112}
              height={112}
              className="absolute -top-6 -right-5 z-1 size-16 rotate-6 object-contain drop-shadow-[3px_3px_0_rgba(58,52,52,0.18)] sm:-top-7 sm:-right-6 sm:size-20"
            />
            <FadeIn delay={0.15} className="card overflow-hidden bg-(--lilac)">
            <div className="flex items-center justify-between border-b border-(--ink)/20 p-6">
              <span className="size-12" />
              <span className="text-5xl font-black text-(--ink)/20">02</span>
            </div>
            <div className="p-7">
              <p className="w-fit bg-(--highlight) px-1 text-xs font-black uppercase">Ya existe un hogar</p>
              <h2 className="mt-3 text-2xl font-black">Tengo una invitación</h2>
              <p className="mt-2 min-h-12 text-sm text-(--ink)/75">
                Escribe el código de ocho caracteres que te han compartido.
              </p>
              <form action={joinHousehold} className="mt-6 space-y-7">
                <label>
                  <span className="label text-(--ink)!">Código de invitación</span>
                  <input
                    className="field uppercase tracking-[.2em]"
                    name="code"
                    required
                    minLength={8}
                    maxLength={8}
                    placeholder="ABC12345"
                    defaultValue={code?.trim().toUpperCase().slice(0, 8) ?? ""}
                  />
                </label>
                <SubmitButton>
                  Unirme <ArrowRight className="ml-2 inline" size={17} />
                </SubmitButton>
              </form>
            </div>
            </FadeIn>
          </div>
        </div>

        <p className="mx-auto mt-8 w-fit bg-(--lime) px-3 py-1 text-center text-xs font-bold">
          Cada persona mantiene además un espacio privado y separado.
        </p>
      </div>
    </main>
  );
}
