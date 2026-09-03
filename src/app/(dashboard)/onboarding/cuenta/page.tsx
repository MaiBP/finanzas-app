import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Wallet } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentHousehold } from "@/lib/household";
import { Button } from "@/components/ui/button";
import { FadeIn, FloatBlob } from "@/components/ui/motion";
import { StepIndicator } from "@/components/onboarding/step-indicator";
import { SUPPORTED_CURRENCIES } from "@/lib/finance/currencies";
import { createFirstAccount } from "./actions";

export const metadata: Metadata = {
  title: "Crea tu primera cuenta",
  robots: { index: false, follow: false },
};

export default async function OnboardingAccountPage() {
  const { supabase, household } = await getCurrentHousehold();
  if (!household) redirect("/onboarding");
  const total = household.role === "owner" ? 6 : 5;

  // A joining member reaches this same step — if their partner already set up a shared account,
  // say so and let them choose instead of silently creating a second, possibly-unwanted shared
  // account under a generic "create your first account" framing that no longer fits.
  const { data: existingShared } = await supabase
    .from("accounts")
    .select("name")
    .eq("household_id", household.id)
    .eq("is_shared", true)
    .is("archived_at", null)
    .order("created_at");
  const sharedAccounts = existingShared ?? [];
  const hasSharedAccounts = sharedAccounts.length > 0;

  return (
    <main className="relative min-h-screen overflow-hidden px-5 py-10 md:py-14">
      <FloatBlob className="absolute -left-20 top-1/3 size-56 rounded-full bg-(--lime)/80" />
      <FloatBlob className="absolute -right-24 top-12 size-64 rounded-full bg-(--blue)/75" />

      <div className="relative z-10 mx-auto max-w-xl">
        <StepIndicator step={3} total={total} label="Primera cuenta" />
        <FadeIn className="text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-full bg-(--ink) text-(--highlight)">
            <Wallet size={22} />
          </span>
          {hasSharedAccounts ? (
            <>
              <h1 className="mt-4 text-4xl font-black tracking-tight md:text-5xl">¿Creamos tu cuenta?</h1>
              <p className="mx-auto mt-3 max-w-md text-(--ink)/75">
                Tu pareja ya creó {sharedAccounts.length === 1 ? "una cuenta compartida" : "cuentas compartidas"}:{" "}
                {sharedAccounts.map((account) => account.name).join(", ")}. Elegí si esta nueva se suma a esa o es
                solo tuya.
              </p>
            </>
          ) : (
            <>
              <h1 className="mt-4 text-4xl font-black tracking-tight md:text-5xl">Creemos tu primera cuenta</h1>
              <p className="mx-auto mt-3 max-w-md text-(--ink)/75">
                Banco, efectivo, tarjeta... la que uses para los gastos del hogar. Podrás agregar más después.
              </p>
            </>
          )}
        </FadeIn>

        <FadeIn delay={0.05} className="card mt-8 p-7">
          <form action={createFirstAccount} className="grid gap-4 sm:grid-cols-2">
            {hasSharedAccounts && (
              <div className="sm:col-span-2">
                <span className="label">¿Qué tipo de cuenta es?</span>
                <div className="mt-1 grid gap-3 sm:grid-cols-2">
                  <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-(--ink)/20 p-3 has-checked:border-(--ink) has-checked:bg-(--highlight)">
                    <input type="radio" name="scope" value="personal" defaultChecked className="mt-1" />
                    <span>
                      <span className="block text-sm font-bold">Personal</span>
                      <span className="block text-xs text-(--ink)/70">Solo vos la ves.</span>
                    </span>
                  </label>
                  <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-(--ink)/20 p-3 has-checked:border-(--ink) has-checked:bg-(--highlight)">
                    <input type="radio" name="scope" value="shared" className="mt-1" />
                    <span>
                      <span className="block text-sm font-bold">Compartida</span>
                      <span className="block text-xs text-(--ink)/70">Se suma a las de tu pareja.</span>
                    </span>
                  </label>
                </div>
              </div>
            )}
            <label className="sm:col-span-2">
              <span className="label">Nombre</span>
              <input className="field" name="name" required maxLength={80} placeholder="Cuenta del hogar" />
            </label>
            <label>
              <span className="label">Tipo de cuenta</span>
              <select className="field" name="type">
                <option value="bank">Banco</option>
                <option value="cash">Efectivo</option>
                <option value="card">Tarjeta</option>
                <option value="savings">Ahorro</option>
                <option value="investment">Inversión</option>
              </select>
            </label>
            <label>
              <span className="label">Moneda</span>
              <select className="field" name="currency" defaultValue="EUR">
                {SUPPORTED_CURRENCIES.map((code) => <option key={code} value={code}>{code}</option>)}
              </select>
            </label>
            <label className="sm:col-span-2">
              <span className="label">Saldo inicial (opcional)</span>
              <input className="field" name="initialBalance" inputMode="decimal" placeholder="0,00" />
            </label>
            <Button type="submit" className="sm:col-span-2">
              Crear cuenta <ArrowRight size={17} />
            </Button>
          </form>
        </FadeIn>

        <p className="mt-5 text-center">
          <Link href="/onboarding/canal" className="text-sm font-bold text-(--ink)/70 underline">
            Hacerlo más tarde
          </Link>
        </p>
      </div>
    </main>
  );
}
