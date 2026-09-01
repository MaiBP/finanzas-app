"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

function ConfirmButton({ label, disabled }: { label: string; disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-(--danger) bg-(--danger) px-6 py-3.5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-(--ink) disabled:pointer-events-none disabled:opacity-50"
    >
      {pending && <Loader2 size={17} className="animate-spin" />}
      {pending ? "Procesando…" : label}
    </button>
  );
}

export function TypeToConfirm({
  action,
  phrase,
  buttonLabel,
}: {
  action: () => void;
  phrase: string;
  buttonLabel: string;
}) {
  const [value, setValue] = useState("");
  const matches = value.trim().toUpperCase() === phrase.toUpperCase();

  return (
    <form action={action} className="mt-4">
      <label>
        <span className="label">
          Escribe <b>{phrase}</b> para confirmar
        </span>
        <input
          className="field"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={phrase}
          autoComplete="off"
        />
      </label>
      <div className="mt-3">
        <ConfirmButton label={buttonLabel} disabled={!matches} />
      </div>
    </form>
  );
}
