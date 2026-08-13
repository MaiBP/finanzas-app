import { Heart } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentHousehold } from "@/lib/household";
import { Button } from "@/components/ui/button";
import { FadeIn, FloatBlob } from "@/components/ui/motion";
import { StepIndicator } from "@/components/onboarding/step-indicator";
import { CopyCodeButton } from "@/components/onboarding/copy-code-button";
import { finishOnboarding, regenerateInvite } from "./actions";

export default async function OnboardingInvitePage() {
  const { supabase, household } = await getCurrentHousehold();
  if (!household || household.role !== "owner") redirect("/app");

  const { data: invite } = await supabase
    .from("household_invites")
    .select("code,expires_at")
    .eq("household_id", household.id)
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <main className="relative min-h-screen overflow-hidden px-5 py-10 md:py-14">
      <FloatBlob className="absolute -left-20 top-1/3 size-56 rounded-full bg-(--lilac)/80" />
      <FloatBlob className="absolute -right-24 top-12 size-64 rounded-full bg-(--lime)/75" />

      <div className="relative z-10 mx-auto max-w-xl">
        <StepIndicator step={6} total={6} label="Invitar a tu pareja" />
        <FadeIn className="text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-full bg-(--ink) text-(--highlight)">
            <Heart size={22} />
          </span>
          <h1 className="mt-4 text-4xl font-black tracking-tight md:text-5xl">Invitá a tu pareja</h1>
          <p className="mx-auto mt-3 max-w-md text-(--ink)/75">
            Compartile este código para que se una a {household.name}. Vence en 7 días.
          </p>
        </FadeIn>

        <FadeIn delay={0.05} className="card mt-8 p-7">
          {invite ? (
            <div className="flex items-center justify-between rounded-xl bg-(--canvas) p-4">
              <code className="text-xl font-black tracking-[.2em]">{invite.code}</code>
              <CopyCodeButton value={invite.code} />
            </div>
          ) : (
            <p className="text-sm text-(--ink)/75">Todavía no tenés un código activo.</p>
          )}
          <form action={regenerateInvite} className="mt-4">
            <button type="submit" className="text-sm font-bold text-(--ink)/70 underline">
              Generar uno nuevo
            </button>
          </form>
          <form action={finishOnboarding} className="mt-6 border-t border-(--ink)/15 pt-6">
            <Button type="submit" className="w-full">Finalizar</Button>
          </form>
        </FadeIn>
      </div>
    </main>
  );
}
