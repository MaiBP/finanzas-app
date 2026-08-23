"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

export function DeletedAccountsPanel({ accounts }: { accounts: { id: number; name: string; date: string }[] }) {
  const [open, setOpen] = useState(true);
  if (!accounts.length) return null;
  return (
    <section className="mt-5 rounded-lg border border-(--ink)/15 bg-(--paper)/60 p-3">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <p className="text-[11px] font-black uppercase tracking-wide text-(--muted)">Cuentas eliminadas recientemente</p>
        <ChevronDown size={14} className={open ? "shrink-0 rotate-180 transition" : "shrink-0 transition"} />
      </button>
      {open && (
        <ul className="mt-1.5 space-y-0.5 text-xs text-(--muted)">
          {accounts.map((account) => (
            <li key={account.id}>
              🗑️ {account.name} · {account.date.slice(0, 10)}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
