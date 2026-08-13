"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

function AcceptButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={disabled || pending} className="mt-5 w-full">
      {pending && <Loader2 size={17} className="animate-spin" />}
      {pending ? "Guardando…" : "Aceptar y continuar"}
    </Button>
  );
}

export function TermsAcceptForm({ action }: { action: (formData: FormData) => void }) {
  const [checked, setChecked] = useState(false);
  return (
    <form action={action}>
      <label className="flex items-start gap-3 text-sm text-(--ink)/85">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => setChecked(event.target.checked)}
          className="mt-1 size-4 shrink-0 accent-(--ink)"
        />
        <span>
          He leído y acepto los{" "}
          <Link href="/terminos" target="_blank" className="font-bold underline">
            Términos y la Política de Privacidad
          </Link>
          .
        </span>
      </label>
      <AcceptButton disabled={!checked} />
    </form>
  );
}
