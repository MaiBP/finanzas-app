import Link from "next/link";
import Image from "next/image";
import { Archive, CreditCard, Landmark, Pencil, TrendingUp } from "lucide-react";
import { getCurrentHousehold } from "@/lib/household";
import { formatMoney } from "@/lib/finance/money";
import { TransactionForm } from "@/components/transactions/transaction-form";
import type { Account, Category } from "@/types/database";
import { archiveAccount, createAccount } from "../cuentas/actions";
import { DeleteTransactionButton } from "@/components/transactions/delete-transaction-button";
import { calculateAccountBalance } from "@/lib/finance/account-overview";
import { decryptField } from "@/lib/security/field-encryption";
import { StatTile } from "@/components/ui/stat-tile";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Banner } from "@/components/ui/banner";

type AccountRow = { id: string; name: string; type: string };
type TransactionRow = {
  id: string;
  type: "expense" | "income";
  amount_cents: number;
  description: string;
  transaction_date: string;
  categories: { name: string } | null;
};
type BalanceMovement = { account_id: string; type: "expense" | "income"; amount_cents: number };

export default async function PersonalPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; error?: string }>;
}) {
  const params = await searchParams;
  const { supabase, user, household } = await getCurrentHousehold();
  if (!household) return null;
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const nextMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 1)).toISOString().slice(0, 10);
  const [
    { data: accountsData },
    { data: transactionsData },
    { data: summaryData },
    { data: balanceData },
    { data: categoriesData },
    { data: profile },
  ] = await Promise.all([
    supabase
      .from("accounts")
      .select("id,name,type")
      .eq("household_id", household.id)
      .eq("owner_user_id", user.id)
      .eq("is_shared", false)
      .is("archived_at", null)
      .order("name"),
    supabase
      .from("transactions")
      .select("id,type,amount_cents,description,transaction_date,categories(name)")
      .eq("household_id", household.id)
      .eq("created_by", user.id)
      .eq("scope", "personal")
      .eq("status", "confirmed")
      .order("transaction_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("transactions")
      .select("type,amount_cents")
      .eq("household_id", household.id)
      .eq("created_by", user.id)
      .eq("scope", "personal")
      .eq("status", "confirmed")
      .gte("transaction_date", monthStart)
      .lt("transaction_date", nextMonth),
    supabase
      .from("transactions")
      .select("account_id,type,amount_cents")
      .eq("household_id", household.id)
      .eq("created_by", user.id)
      .eq("scope", "personal")
      .eq("status", "confirmed"),
    supabase
      .from("categories")
      .select("id,name,kind,icon,color")
      .or(`household_id.eq.${household.id},household_id.is.null`)
      .order("name"),
    supabase.from("profiles").select("personal_space_name").eq("id", user.id).maybeSingle(),
  ]);
  const accounts = (accountsData ?? []) as AccountRow[];
  const transactions = ((transactionsData ?? []) as unknown as TransactionRow[]).map((row) => ({ ...row, description: decryptField(row.description) }));
  const summary = (summaryData ?? []) as { type: "expense" | "income"; amount_cents: number }[];
  const balanceMovements = (balanceData ?? []) as BalanceMovement[];
  const income = summary.filter((row) => row.type === "income").reduce((sum, row) => sum + row.amount_cents, 0);
  const expenses = summary.filter((row) => row.type === "expense").reduce((sum, row) => sum + row.amount_cents, 0);

  return (
    <>
      <div>
        <p className="text-sm font-bold uppercase">Espacio personal · privado para ti</p>
        <h1 className="mt-1 text-3xl font-black md:text-4xl">{profile?.personal_space_name ?? "Mi espacio"}</h1>
        <p className="mt-3 max-w-2xl text-(--ink)/75">
          Tus cuentas y movimientos individuales no se muestran a otros miembros. Finzy sí puede
          consultarlos junto con las finanzas del hogar cuando tú lo pidas.
        </p>
      </div>
      {params.created && (
        <p className="mt-5 rounded-xl bg-(--lime) p-3 text-sm font-bold">Movimiento personal guardado.</p>
      )}
      <Banner kind="error">{params.error}</Banner>

      <section className="mt-7 grid grid-cols-2 gap-3">
        <StatTile label="Ingresos personales · mes" value={formatMoney(income)} tone="green" image="/incoming-bag.png" />
        <StatTile label="Gastos personales · mes" value={formatMoney(expenses)} tone="coral" image="/money-wings.png" />
      </section>

      <div className="mt-7 grid gap-6 xl:grid-cols-[.9fr_1.1fr]">
        <section className="card p-6">
          <h2 className="text-xl font-black">Mis cuentas</h2>
          <div className="mt-5 space-y-3">
            {accounts.map((account) => (
              <article className="flex items-center gap-3 border-b border-black/10 pb-3" key={account.id}>
                <span className="grid size-10 place-items-center rounded-xl bg-(--blue)">
                  {account.type === "bank" ? (
                    <Image src="/bank-building.png" alt="" width={32} height={32} className="size-6 object-contain" />
                  ) : account.type === "cash" ? (
                    <Image src="/money-cash.png" alt="" width={32} height={32} className="size-6 object-contain" />
                  ) : account.type === "card" ? (
                    <CreditCard size={19} />
                  ) : account.type === "investment" ? (
                    <TrendingUp size={19} />
                  ) : (
                    <Landmark size={19} />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{account.name}</p>
                  <p className="text-sm">{formatMoney(calculateAccountBalance(account.id, balanceMovements))}</p>
                  <p className="text-xs text-(--muted)">Según movimientos registrados</p>
                </div>
                <form action={archiveAccount}>
                  <input type="hidden" name="id" value={account.id} />
                  <button aria-label={`Archivar ${account.name}`} className="rounded-lg p-2">
                    <Archive size={17} />
                  </button>
                </form>
              </article>
            ))}
            {!accounts.length && (
              <p className="text-sm text-(--muted)">Crea tu primera cuenta personal para comenzar.</p>
            )}
          </div>
          <form action={createAccount} className="mt-6 grid gap-4">
            <h3 className="font-black">Nueva cuenta personal</h3>
            <label>
              <span className="label">Nombre</span>
              <input className="field" name="name" required placeholder="Mi tarjeta" />
            </label>
            <label>
              <span className="label">Tipo</span>
              <select className="field" name="type">
                <option value="bank">Banco</option>
                <option value="card">Tarjeta</option>
                <option value="cash">Efectivo</option>
                <option value="savings">Ahorros</option>
                <option value="investment">Inversión</option>
              </select>
            </label>
            <p className="text-xs text-(--muted)">
              Comenzará en 0,00 € y cambiará únicamente con movimientos registrados.
            </p>
            <Button type="submit">Crear cuenta</Button>
          </form>
        </section>

        <section className="card p-6">
          <h2 className="text-xl font-black">Nuevo movimiento personal</h2>
          <TransactionForm
            mode="personal"
            accounts={accounts as Pick<Account, "id" | "name">[]}
            categories={(categoriesData ?? []) as Category[]}
          />
        </section>
      </div>

      <section className="card mt-7 overflow-hidden">
        <div className="border-b border-black/10 px-5 py-4">
          <h2 className="font-black">Movimientos personales recientes</h2>
        </div>
        {transactions.map((row) => (
          <article key={row.id} className="flex items-center gap-3 border-b border-black/10 p-4 last:border-0">
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold">{row.description}</p>
              <p className="text-xs text-(--muted)">
                {row.categories?.name ?? "Sin categoría"} · {row.transaction_date}
              </p>
            </div>
            <b>
              {row.type === "expense" ? "−" : "+"}
              {formatMoney(row.amount_cents)}
            </b>
            <Link
              href={`/app/movimientos/${row.id}/editar`}
              aria-label={`Editar ${row.description}`}
              className="rounded-lg p-2"
            >
              <Pencil size={17} />
            </Link>
            <DeleteTransactionButton id={row.id} description={row.description} returnTo="/app/personal" />
          </article>
        ))}
        {!transactions.length && (
          <EmptyState
            image="/piggy-bank.png"
            title="Todavía no hay movimientos personales"
            description="Registrá el primero desde el formulario de arriba."
          />
        )}
      </section>
    </>
  );
}
