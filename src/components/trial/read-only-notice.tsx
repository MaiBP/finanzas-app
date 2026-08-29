import { Lock } from "lucide-react";
import { LinkButton } from "@/components/ui/button";

/** Shown instead of a form/chat input once a household's trial has ended and it's read-only. */
export function ReadOnlyNotice({ action }: { action: string }) {
  return (
    <div className="card flex flex-col items-start gap-4 p-6 md:p-8">
      <span className="grid size-11 place-items-center rounded-xl bg-[#f7d9d9]">
        <Lock size={20} className="text-[#c23b3b]" />
      </span>
      <div>
        <h2 className="font-black">Tu prueba de 30 días terminó</h2>
        <p className="mt-1 text-sm text-(--muted)">
          Podés ver todo tu historial, pero para {action} activá tu suscripción por 4,99 €/mes.
        </p>
      </div>
      <LinkButton href="/app/ajustes" size="sm">
        Activar suscripción
      </LinkButton>
    </div>
  );
}
