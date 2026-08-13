import { Check, Send } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentHousehold } from "@/lib/household";
import { Button } from "@/components/ui/button";
import { FadeIn, FloatBlob } from "@/components/ui/motion";
import { StepIndicator } from "@/components/onboarding/step-indicator";
import { TelegramDownloadLink } from "@/components/onboarding/telegram-download-link";
import { continueFromTelegram, generateAndShowCode } from "./actions";

export default async function OnboardingTelegramPage() {
  const { supabase, user, household } = await getCurrentHousehold();
  if (!household) redirect("/onboarding");
  const total = household.role === "owner" ? 6 : 5;
  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "Finzy_AssistantBot";

  const [{ data: link }, { data: linkCode }] = await Promise.all([
    supabase.from("telegram_links").select("linked_at").eq("user_id", user.id).maybeSingle(),
    supabase
      .from("telegram_link_codes")
      .select("code,expires_at")
      .eq("user_id", user.id)
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return (
    <main className="relative min-h-screen overflow-hidden px-5 py-10 md:py-14">
      <FloatBlob className="absolute -left-20 top-1/3 size-56 rounded-full bg-(--blue)/80" />
      <FloatBlob className="absolute -right-24 top-12 size-64 rounded-full bg-(--lime)/75" />

      <div className="relative z-10 mx-auto max-w-xl">
        <StepIndicator step={5} total={total} label="Vincular Telegram" />
        <FadeIn className="text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-full bg-(--ink) text-(--highlight)">
            <Send size={22} />
          </span>
          <h1 className="mt-4 text-4xl font-black tracking-tight md:text-5xl">Vinculemos tu Telegram</h1>
          <p className="mx-auto mt-3 max-w-md text-(--ink)/75">
            Así vas a poder registrar y consultar tus finanzas escribiéndole al bot en cualquier momento.
          </p>
        </FadeIn>

        <FadeIn delay={0.05} className="card mt-8 p-7 text-center">
          {link ? (
            <div className="flex flex-col items-center gap-3">
              <span className="grid size-12 place-items-center rounded-full bg-(--lime)">
                <Check size={22} />
              </span>
              <p className="font-bold">¡Ya vinculaste tu Telegram!</p>
              <form action={continueFromTelegram} className="w-full">
                <Button type="submit" className="w-full">Continuar</Button>
              </form>
            </div>
          ) : linkCode ? (
            <div>
              <a
                href={`https://t.me/${botUsername}?start=${linkCode.code}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-(--ink) bg-(--highlight) px-6 py-3.5 font-bold text-(--ink) transition hover:-translate-y-0.5 hover:bg-(--ink) hover:text-(--highlight)"
              >
                <Send size={17} /> Abrir Telegram y vincular
              </a>
              <p className="mt-4 text-xs text-(--muted)">
                Si no se abre el chat solo, escribile a <a className="font-bold underline" href={`https://t.me/${botUsername}`} target="_blank" rel="noreferrer">@{botUsername}</a>{" "}
                el mensaje <code className="font-bold">/vincular {linkCode.code}</code> antes de 10 minutos.
              </p>
              <TelegramDownloadLink />
              <form action={continueFromTelegram} className="mt-6 border-t border-(--ink)/15 pt-5">
                <Button type="submit" variant="outline" className="w-full">Ya vinculé, continuar</Button>
                <button type="submit" className="mt-3 text-sm font-bold text-(--ink)/70 underline">
                  Hacerlo más tarde
                </button>
              </form>
            </div>
          ) : (
            <form action={generateAndShowCode}>
              <p className="text-sm text-(--ink)/75">Generá un código para vincular tu cuenta con el bot.</p>
              <Button type="submit" className="mt-5 w-full">Generar código</Button>
              <button type="submit" formAction={continueFromTelegram} className="mt-3 text-sm font-bold text-(--ink)/70 underline">
                Hacerlo más tarde
              </button>
            </form>
          )}
        </FadeIn>
      </div>
    </main>
  );
}
