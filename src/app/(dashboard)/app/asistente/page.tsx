import { Bot } from "lucide-react";
import { AssistantForm } from "@/components/assistant/assistant-form";
import { getCurrentHousehold } from "@/lib/household";
import { fetchRecentMessages } from "@/services/conversation-history";

export default async function AssistantPage() {
  const { supabase, user, household } = await getCurrentHousehold();
  const initialMessages = household ? await fetchRecentMessages(supabase, user.id, 20) : [];

  return (
    <div className="mx-auto max-w-2xl">
      <p className="text-sm font-bold uppercase">Herramienta general</p>
      <h1 className="mt-1 text-3xl font-black">Asistente</h1>
      <p className="mt-2 text-(--muted)">
        Pregunta por el hogar, por tu espacio personal o por el resultado combinado.
      </p>
      <section className="card mt-7 p-6">
        <div className="flex gap-3 rounded-2xl bg-(--blue) p-4">
          <Bot className="shrink-0 text-(--ink)" />
          <div>
            <b>¿Qué quieres saber?</b>
            <p className="mt-1 text-sm text-(--ink)/70">
              Distingo las finanzas compartidas de tus movimientos privados y solo combino ambos espacios cuando la
              consulta lo requiere. También puedo responder dudas generales de finanzas personales.
            </p>
          </div>
        </div>
        <AssistantForm initialMessages={initialMessages} />
      </section>
    </div>
  );
}
