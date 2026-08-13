"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopyCodeButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      aria-label="Copiar código"
      onClick={() => {
        navigator.clipboard.writeText(value).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        });
      }}
      className="rounded-lg p-2 text-(--ink)/70 transition hover:bg-(--ink)/10 hover:text-(--ink)"
    >
      {copied ? <Check size={18} /> : <Copy size={18} />}
    </button>
  );
}
