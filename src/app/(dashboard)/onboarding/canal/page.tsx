import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentHousehold } from "@/lib/household";
import { FadeIn, FloatBlob } from "@/components/ui/motion";
import { StepIndicator } from "@/components/onboarding/step-indicator";
import { ChannelChoice } from "@/components/onboarding/channel-choice";

export const metadata: Metadata = {
  title: "¿Cómo registrar tus gastos?",
  robots: { index: false, follow: false },
};

export default async function OnboardingChannelPage() {
  const { household } = await getCurrentHousehold();
  if (!household) redirect("/onboarding");
  const total = household.role === "owner" ? 6 : 5;

  return (
    <main className="relative min-h-screen overflow-hidden px-5 py-10 md:py-14">
      <FloatBlob className="absolute -left-20 top-1/3 size-56 rounded-full bg-(--pink)/80" />
      <FloatBlob className="absolute -right-24 top-12 size-64 rounded-full bg-(--savings)/75" />

      <div className="relative z-10 mx-auto max-w-3xl">
        <StepIndicator step={4} total={total} label="Canal" />
        <FadeIn className="text-center">
          <h1 className="text-4xl font-black tracking-tight md:text-5xl">¿Cómo querés registrar tus gastos?</h1>
          <p className="mx-auto mt-3 max-w-md text-(--ink)/75">
            Elegí desde dónde le vas a hablar al asistente.
          </p>
        </FadeIn>
        <ChannelChoice />
      </div>
    </main>
  );
}
