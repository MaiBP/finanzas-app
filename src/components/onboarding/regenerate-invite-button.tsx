"use client";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

export function RegenerateInviteButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-1.5 text-sm font-bold text-(--ink)/70 underline disabled:no-underline disabled:opacity-60"
    >
      {pending && <Loader2 size={14} className="animate-spin" />}
      {pending ? "Generando…" : "Generar uno nuevo"}
    </button>
  );
}
