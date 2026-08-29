"use client";
import { Lock, X } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { dismissTrialNotification } from "@/app/(dashboard)/app/trial-actions";

const COPY: Record<string, { text: string; cta: string }> = {
  day20: { text: "Ya llevás 20 días de prueba gratuita. Te quedan 10 días.", cta: "Ver planes" },
  day27: { text: "Tu prueba termina en 3 días. Activá tu suscripción para no perder acceso.", cta: "Activar suscripción" },
  trial_ended: { text: "Tu prueba terminó: tu hogar está en modo solo lectura.", cta: "Activar suscripción" },
};

export function TrialBanner({ id, notificationKey }: { id: string; notificationKey: string }) {
  const copy = COPY[notificationKey];
  if (!copy) return null;
  return (
    <div className="flex items-center gap-3 border-b border-(--ink)/15 bg-(--highlight)/50 px-5 py-2.5 text-sm md:px-8">
      <Lock size={16} className="shrink-0" />
      <p className="min-w-0 flex-1 font-medium">{copy.text}</p>
      <LinkButton href="/app/ajustes" size="sm" className="shrink-0">
        {copy.cta}
      </LinkButton>
      <button
        type="button"
        aria-label="Cerrar aviso"
        onClick={() => dismissTrialNotification(id)}
        className="shrink-0 rounded-full p-1.5 hover:bg-(--ink)/10"
      >
        <X size={16} />
      </button>
    </div>
  );
}
