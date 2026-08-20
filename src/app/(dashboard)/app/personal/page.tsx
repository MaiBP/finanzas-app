import Link from "next/link";
import Image from "next/image";
import { Pencil } from "lucide-react";
import { getCurrentHousehold } from "@/lib/household";
import { formatMoney } from "@/lib/finance/money";
import { TransactionForm } from "@/components/transactions/transaction-form";
import type { Account, Category } from "@/types/database";
import { archiveAccount, adjustAccountBalance, createAccount, updateAccount } from "../cuentas/actions";
import { DeleteTransactionButton } from "@/components/transactions/delete-transaction-button";
import { DeleteAccountButton } from "@/components/accounts/delete-account-button";
import { AccountIcon, FLOATING_ACCOUNT_IMAGES } from "@/components/accounts/account-icon";
import { ACCOUNT_TYPE_LABELS } from "@/lib/finance/account-types";
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
type MonthExpenseRow = { account_id: string; amount_cents: number };

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
    { data: monthExpenseData },
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
      .from("transactions")
      .select("account_id,amount_cents")
      .eq("household_id", household.id)
      .eq("created_by", user.id)
      .eq("scope", "personal")
      .eq("type", "expense")
      .eq("status", "confirmed")
      .gte("transaction_date", monthStart)
      .lt("transaction_date", nextMonth),
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
  const totalBalance = accounts.reduce((total, account) => total + calculateAccountBalance(account.id, balanceMovements), 0);
  const totalBalanceLabel = totalBalance > 0 ? "Saldo positivo" : totalBalance < 0 ? "Saldo negativo" : "En equilibrio";
  const monthExpenseByAccount = new Map<string, number>();
  for (const row of (monthExpenseData ?? []) as MonthExpenseRow[]) {
    monthExpenseByAccount.set(row.account_id, (monthExpenseByAccount.get(row.account_id) ?? 0) + row.amount_cents);
  }
  const personalSpaceName = profile?.personal_space_name ?? "Mi espacio";

  return (
    <>
      <div>
        <p className="text-sm font-bold uppercase">Espacio personal · privado para ti</p>
        <h1 className="mt-1 text-3xl font-black md:text-4xl">{personalSpaceName}</h1>
        <p className="mt-3 max-w-2xl text-(--ink)/75">
          Tus cuentas y movimientos individuales no se muestran a otros miembros. Finzy sí puede
          consultarlos junto con las finanzas del hogar cuando tú lo pidas.
        </p>
      </div>
      {params.created && (
        <p className="mt-5 rounded-xl bg-(--lime) p-3 text-sm font-bold">Movimiento personal guardado.</p>
      )}
      <Banner kind="error">{params.error}</Banner>

      <section className="card mt-7 overflow-hidden">
        <div className="grid gap-6 p-6 md:grid-cols-[1.2fr_.8fr] md:items-end">
          <div>
            <p className="w-fit bg-(--highlight) px-1 text-xs font-black uppercase tracking-wide">
              {personalSpaceName}
            </p>
            <p className={`mt-3 text-5xl font-black ${totalBalance < 0 ? "text-[#b34f36]" : "text-(--success)"}`}>
              {totalBalance > 0 ? "+" : ""}
              {formatMoney(totalBalance)}
            </p>
            <p className="mt-2 text-xs font-bold uppercase tracking-wide text-(--muted)">
              {totalBalanceLabel} · {accounts.length} {accounts.length === 1 ? "cuenta activa" : "cuentas activas"}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <StatTile label="Ingresos · mes" value={formatMoney(income)} tone="green" image="/incoming-bag.png" />
            <StatTile label="Gastos · mes" value={formatMoney(expenses)} tone="coral" image="/money-wings.png" />
          </div>
        </div>
      </section>

      <div className="mt-7">
        <h2 className="text-xl font-black">Mis cuentas</h2>
        <p className="mt-1 text-sm text-(--muted)">
          Aquí se discrimina de dónde entra o sale tu dinero personal.
        </p>
        <div className="mt-4 grid gap-5 lg:grid-cols-2">
          {accounts.map((account) => {
            const accountMovements = balanceMovements.filter((movement) => movement.account_id === account.id);
            const allIncome = accountMovements
              .filter((movement) => movement.type === "income")
              .reduce((sum, movement) => sum + movement.amount_cents, 0);
            const allExpenses = accountMovements
              .filter((movement) => movement.type === "expense")
              .reduce((sum, movement) => sum + movement.amount_cents, 0);
            const balance = calculateAccountBalance(account.id, balanceMovements);
            const balanceLabel = balance > 0 ? "Saldo positivo" : balance < 0 ? "Saldo negativo" : "En equilibrio";
            const monthExpense = monthExpenseByAccount.get(account.id) ?? 0;
            const floatingImage = FLOATING_ACCOUNT_IMAGES[account.type];
            return (
              <div className="relative" key={account.id}>
                {floatingImage && (
                  <Image
                    src={floatingImage}
                    alt=""
                    width={112}
                    height={112}
                    className="absolute -top-6 -left-5 z-1 size-16 -rotate-6 object-contain drop-shadow-[3px_3px_0_rgba(58,52,52,0.18)] sm:-top-7 sm:-left-6 sm:size-20"
                  />
                )}
                <article className="card overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-center justify-between">
                      {floatingImage ? (
                        <span className="size-11" />
                      ) : (
                        <span className="grid size-11 place-items-center rounded-xl bg-(--blue)">
                          <AccountIcon type={account.type} />
                        </span>
                      )}
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-(--lilac) px-2.5 py-1 text-xs font-bold">
                          {ACCOUNT_TYPE_LABELS[account.type] ?? "Personal"}
                        </span>
                        <DeleteAccountButton id={account.id} name={account.name} action={archiveAccount} />
                      </div>
                    </div>
                    <h3 className="mt-5 text-lg font-black">{account.name}</h3>
                    <p className={`mt-1 text-4xl font-black ${balance < 0 ? "text-[#b34f36]" : "text-(--success)"}`}>
                      {balance > 0 ? "+" : ""}
                      {formatMoney(balance)}
                    </p>
                    <p className="mt-1 text-xs font-bold uppercase tracking-wide text-(--muted)">
                      {balanceLabel} actual
                    </p>
                    <p className="mt-3 text-xs text-(--muted)">
                      Ingresos registrados {formatMoney(allIncome)} − gastos registrados {formatMoney(allExpenses)}
                    </p>
                  </div>
                  <div className="border-t border-(--ink)/15 bg-(--highlight) p-5">
                    <p className="text-xs font-black uppercase tracking-wide">Gasto del mes</p>
                    <p className="mt-1 text-lg font-black">{formatMoney(monthExpense)}</p>
                  </div>
                  <details className="border-t border-(--ink)/15 bg-white p-5">
                    <summary className="cursor-pointer text-sm font-black">Editar cuenta</summary>
                    <form action={updateAccount} className="mt-4 grid gap-3 sm:grid-cols-2">
                      <input type="hidden" name="id" value={account.id} />
                      <label>
                        <span className="label">Nombre</span>
                        <input className="field" name="name" defaultValue={account.name} required maxLength={80} />
                      </label>
                      <label>
                        <span className="label">Tipo</span>
                        <select className="field" name="type" defaultValue={account.type}>
                          <option value="bank">Banco</option>
                          <option value="card">Tarjeta</option>
                          <option value="cash">Efectivo</option>
                          <option value="savings">Ahorros</option>
                          <option value="investment">Inversión</option>
                        </select>
                      </label>
                      <Button type="submit" size="sm" className="self-end">Guardar cambios</Button>
                      <p className="text-xs text-(--muted) sm:col-span-2">El saldo cambia al registrar, editar o eliminar movimientos — usa «Ajustar saldo» aquí abajo si necesitas corregirlo de una vez.</p>
                    </form>
                  </details>
                  <details className="border-t border-(--ink)/15 bg-white p-5">
                    <summary className="cursor-pointer text-sm font-black">Ajustar saldo</summary>
                    <form action={adjustAccountBalance} className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                      <input type="hidden" name="id" value={account.id} />
                      <label>
                        <span className="label">Saldo real</span>
                        <input
                          className="field"
                          name="targetBalance"
                          required
                          inputMode="decimal"
                          defaultValue={(balance / 100).toFixed(2).replace(".", ",")}
                        />
                      </label>
                      <Button type="submit" size="sm">Ajustar saldo</Button>
                      <p className="text-xs text-(--muted) sm:col-span-2">
                        Si no coincide con lo calculado, se creará un movimiento de «Ajuste de saldo» por la diferencia.
                      </p>
                    </form>
                  </details>
                </article>
              </div>
            );
          })}
          {!accounts.length && (
            <div className="card">
              <EmptyState
                image="/private.png"
                title="Todavía no tienes cuentas personales"
                description="Crea efectivo, banco, tarjeta u otra cuenta para registrar tus movimientos privados."
              />
            </div>
          )}
        </div>
      </div>

      <section className="card mt-7 max-w-3xl p-6">
        <h2 className="text-xl font-black">Crear otra cuenta personal</h2>
        <p className="mt-1 text-sm text-(--muted)">
          Si arranca en cero, deja el saldo inicial vacío. Si ya tiene dinero, indícalo y quedará
          registrado como el movimiento «Nueva cuenta creada».
        </p>
        <form action={createAccount} className="mt-6 grid gap-4 sm:grid-cols-2">
          <label>
            <span className="label">Nombre</span>
            <input className="field" name="name" required maxLength={80} placeholder="Mi tarjeta" />
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
          <label>
            <span className="label">Saldo inicial (opcional)</span>
            <input className="field" name="initialBalance" inputMode="decimal" placeholder="0,00" />
          </label>
          <Button type="submit" className="self-start sm:self-end">
            Crear cuenta
          </Button>
        </form>
      </section>

      <section className="card mt-7 p-6">
        <h2 className="text-xl font-black">Nuevo movimiento personal</h2>
        <TransactionForm
          mode="personal"
          accounts={accounts as Pick<Account, "id" | "name">[]}
          categories={(categoriesData ?? []) as Category[]}
        />
      </section>

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
