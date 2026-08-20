"use client";
import { useActionState, useState } from "react";
import { createPersonalTransaction, createTransaction, type ActionState } from "@/app/(dashboard)/app/actions";
import { Button } from "@/components/ui/button";
import type { Account, Category } from "@/types/database";

const initialState: ActionState = {};
export function TransactionForm({ accounts, categories, mode = "shared" }: { accounts: Pick<Account,"id"|"name">[]; categories: Category[]; mode?: "shared"|"personal" }) {
  const [state, action, pending] = useActionState(mode === "personal" ? createPersonalTransaction : createTransaction, initialState);
  const [type, setType] = useState<"expense"|"income">("expense");
  const today = new Date().toISOString().slice(0,10);
  const visibleCategories = categories.filter((category) => category.kind === type);
  return <form action={action} className="space-y-5">
    {state.error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{state.error}</p>}
    <div className="grid grid-cols-2 gap-3">
      <label><span className="label">Tipo</span><select className="field" name="type" value={type} onChange={(event) => setType(event.target.value as "expense"|"income")}><option value="expense">Gasto</option><option value="income">Ingreso</option></select></label>
      <label><span className="label">Importe</span><div className="relative"><input className="field pr-9" name="amount" required inputMode="decimal" placeholder="0,00"/><span className="absolute right-3 top-3 text-[#6c7f7a]">€</span></div></label>
    </div>
    <label><span className="label">Descripción</span><input className="field" name="description" required maxLength={160} placeholder="Mercadona"/></label>
    <div className="grid gap-3 sm:grid-cols-2">
      {/* Keyed on type so switching Tipo remounts this select back to its placeholder — the
          previously selected option can belong to the other kind once the list is refiltered. */}
      <label><span className="label">Categoría</span><select key={type} className="field" name="categoryId" required defaultValue=""><option value="" disabled>Elige una</option>{visibleCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
      <label><span className="label">Cuenta</span><select className="field" name="accountId" required defaultValue=""><option value="" disabled>Elige una</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
    </div>
    <label className="block max-w-56"><span className="label">Fecha</span><input className="field" name="transactionDate" type="date" defaultValue={today} required/></label>
    <Button type="submit" disabled={pending || !accounts.length} className="w-full">{pending ? "Guardando…" : mode === "shared" ? "Guardar en conjunto" : "Guardar en mi espacio"}</Button>
    <p className="text-center text-xs text-[#6c7f7a]">{mode === "shared" ? "Se repartirá automáticamente entre los miembros activos." : "Solo tú podrás ver este movimiento; Finzy podrá incluirlo en tus consultas."}</p>
  </form>;
}
