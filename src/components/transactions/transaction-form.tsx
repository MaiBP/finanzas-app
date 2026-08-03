"use client";
import { useActionState } from "react";
import { createPersonalTransaction, createTransaction, type ActionState } from "@/app/(dashboard)/app/actions";
import type { Account, Category } from "@/types/database";

const initialState: ActionState = {};
export function TransactionForm({ accounts, categories, mode = "shared" }: { accounts: Pick<Account,"id"|"name">[]; categories: Category[]; mode?: "shared"|"personal" }) {
  const [state, action, pending] = useActionState(mode === "personal" ? createPersonalTransaction : createTransaction, initialState);
  const today = new Date().toISOString().slice(0,10);
  return <form action={action} className="space-y-5">
    {state.error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{state.error}</p>}
    <div className="grid grid-cols-2 gap-3"><label><span className="label">Tipo</span><select className="field" name="type" defaultValue="expense"><option value="expense">Gasto</option><option value="income">Ingreso</option></select></label><label><span className="label">Importe</span><div className="relative"><input className="field pr-9" name="amount" required inputMode="decimal" placeholder="0,00"/><span className="absolute right-3 top-3 text-[#6c7f7a]">€</span></div></label></div>
    <label><span className="label">Descripción</span><input className="field" name="description" required maxLength={160} placeholder="Compra en el supermercado"/></label>
    <div className="grid gap-3 sm:grid-cols-2"><label><span className="label">Categoría</span><select className="field" name="categoryId" required defaultValue=""><option value="" disabled>Elige una</option>{categories.map(c=><option key={c.id} value={c.id}>{c.kind === "income" ? "↑ " : "↓ "}{c.name}</option>)}</select></label><label><span className="label">Cuenta</span><select className="field" name="accountId" required defaultValue=""><option value="" disabled>Elige una</option>{accounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label></div>
    <label><span className="label">Fecha</span><input className="field" name="transactionDate" type="date" defaultValue={today} required/></label>
    <button disabled={pending || !accounts.length} className="w-full rounded-xl px-5 py-3.5 font-bold disabled:opacity-60">{pending ? "Guardando…" : mode === "shared" ? "Guardar en conjunto" : "Guardar en mi espacio"}</button>
    <p className="text-center text-xs text-[#6c7f7a]">{mode === "shared" ? "Se repartirá automáticamente entre los miembros activos." : "Solo tú podrás ver este movimiento; el bot podrá incluirlo en tus consultas."}</p>
  </form>;
}
