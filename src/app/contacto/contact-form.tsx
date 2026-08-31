"use client";
import { useActionState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sendContactMessage, type ContactState } from "./actions";

const initialState: ContactState = {};

export function ContactForm() {
  const [state, action, pending] = useActionState(sendContactMessage, initialState);

  if (state.success) {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <span className="grid size-11 place-items-center rounded-full bg-(--lime)">
          <Check size={20} />
        </span>
        <p className="font-black">¡Gracias por escribirnos!</p>
        <p className="text-sm text-(--muted)">Te vamos a responder a la brevedad.</p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5">
      {state.error && (
        <p role="alert" className="rounded-xl bg-(--danger)/10 p-3 text-sm text-(--danger)">
          {state.error}
        </p>
      )}
      <label>
        <span className="label">Tema</span>
        <select className="field" name="topic" defaultValue="general">
          <option value="general">Consulta general</option>
          <option value="sugerencia">Sugerencia</option>
          <option value="problema">Reportar un problema</option>
          <option value="facturacion">Facturación / suscripción</option>
          <option value="otro">Otro</option>
        </select>
      </label>
      <label>
        <span className="label">Tu email (para responderte)</span>
        <input className="field" type="email" name="email" placeholder="tu@email.com" />
      </label>
      <label>
        <span className="label">Mensaje</span>
        <textarea
          className="field"
          style={{ borderRadius: "1rem" }}
          name="message"
          rows={5}
          required
          minLength={10}
          maxLength={2000}
          placeholder="Contanos qué necesitás..."
        />
      </label>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Enviando…" : "Enviar mensaje"}
      </Button>
    </form>
  );
}
