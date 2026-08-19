"use client";

import { useState } from "react";
import Link from "next/link";
import { MessageCircle, Send } from "lucide-react";
import { buttonClasses, LinkButton } from "@/components/ui/button";
import { FadeIn } from "@/components/ui/motion";

export function ChannelChoice() {
  const [showWhatsappNote, setShowWhatsappNote] = useState(false);

  return (
    <div className="mt-8 grid gap-6 md:grid-cols-2">
      <FadeIn delay={0.05} className="card overflow-hidden bg-(--blue)">
        <div className="p-7">
          <span className="grid size-12 place-items-center rounded-full bg-(--highlight)">
            <Send size={22} />
          </span>
          <h2 className="mt-4 text-2xl font-black">Telegram</h2>
          <p className="mt-2 min-h-12 text-sm text-(--ink)/75">
            Registra movimientos y consulta tus finanzas escribiéndole a Finzy.
          </p>
          <LinkButton href="/onboarding/telegram" className="mt-5 w-full">
            Usar Telegram
          </LinkButton>
        </div>
      </FadeIn>

      <FadeIn delay={0.15} className="card overflow-hidden bg-(--lilac)">
        <div className="p-7">
          <span className="grid size-12 place-items-center rounded-full bg-(--highlight)">
            <MessageCircle size={22} />
          </span>
          <h2 className="mt-4 text-2xl font-black">WhatsApp</h2>
          <p className="mt-2 min-h-12 text-sm text-(--ink)/75">
            Muy pronto vamos a sumar esta opción. Por ahora, seguí con Telegram.
          </p>
          {showWhatsappNote ? (
            <Link href="/onboarding/telegram" className={buttonClasses("primary", "md", "mt-5 w-full")}>
              Usar Telegram por ahora
            </Link>
          ) : (
            <button type="button" onClick={() => setShowWhatsappNote(true)} className={buttonClasses("outline", "md", "mt-5 w-full")}>
              Elegir WhatsApp
            </button>
          )}
        </div>
      </FadeIn>
    </div>
  );
}
