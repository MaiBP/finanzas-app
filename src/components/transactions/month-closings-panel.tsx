"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { formatMoney } from "@/lib/finance/money";

export function MonthClosingsPanel({
  closings,
}: {
  closings: { id: string; closingDate: string; totalBalanceCents: number; baseCurrency: string }[];
}) {
  const [open, setOpen] = useState(true);
  if (!closings.length) return null;
  return (
    <section className="mt-5 rounded-lg border border-(--ink)/15 bg-(--paper)/60 p-3">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <p className="text-[11px] font-black uppercase tracking-wide text-(--muted)">Cierres de mes</p>
        <ChevronDown size={14} className={open ? "shrink-0 rotate-180 transition" : "shrink-0 transition"} />
      </button>
      {open && (
        <ul className="mt-1.5 space-y-0.5 text-xs text-(--muted)">
          {closings.map((closing) => {
            const label = new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${closing.closingDate}T00:00:00Z`));
            return (
              <li key={closing.id}>
                📅 Cierre de {label}: {formatMoney(closing.totalBalanceCents, closing.baseCurrency)}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
