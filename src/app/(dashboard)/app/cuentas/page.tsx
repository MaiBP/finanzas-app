import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { getCurrentHousehold } from "@/lib/household";
import { formatMoney } from "@/lib/finance/money";
import {
  calculateAccountBalance,
  calculateParticipantExpenses,
} from "@/lib/finance/account-overview";
import { adjustSharedAccountBalance, archiveSharedAccount, createSharedAccount, updateSharedAccount } from "./actions";
import { StatTile } from "@/components/ui/stat-tile";
import { EmptyState } from "@/components/ui/empty-state";
import { Button, LinkButton } from "@/components/ui/button";
import { getHouseholdRoster } from "@/services/household-roster";
import { DeleteAccountButton } from "@/components/accounts/delete-account-button";
import { AccountIcon, FLOATING_ACCOUNT_IMAGES } from "@/components/accounts/account-icon";
import { ACCOUNT_TYPE_LABELS } from "@/lib/finance/account-types";
import { SUPPORTED_CURRENCIES } from "@/lib/finance/currencies";

type AccountRow = {
  id: string;
  name: string;
  type: string;
  currency: string;
};
type BalanceMovement = {
  account_id: string;
  type: "expense" | "income";
  amount_cents: number;
};
type ExpenseMovement = {
  account_id: string;
  paid_by: string | null;
  amount_cents: number;
};
const typeNames = ACCOUNT_TYPE_LABELS;

export default async function AccountsPage() {
  const { supabase, household } = await getCurrentHousehold();
  if (!household) return null;
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthStart = `${month}-01`;
  const nextMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 1)).toISOString().slice(0, 10);
  const monthName = new Intl.DateTimeFormat("es-ES", { month: "long" }).format(now);
  const [
    { data: accountsData },
    { data: balanceData },
    { data: expenseData },
    members,
  ] = await Promise.all([
    supabase
      .from("accounts")
      .select("id,name,type,currency")
      .eq("household_id", household.id)
      .eq("is_shared", true)
      .is("archived_at", null)
      .order("created_at"),
    supabase
      .from("transactions")
      .select("account_id,type,amount_cents")
      .eq("household_id", household.id)
      .eq("scope", "shared")
      .eq("status", "confirmed"),
    supabase
      .from("transactions")
      .select("account_id,paid_by,amount_cents")
      .eq("household_id", household.id)
      .eq("scope", "shared")
      .eq("type", "expense")
      .eq("status", "confirmed")
      .gte("transaction_date", monthStart)
      .lt("transaction_date", nextMonth),
    getHouseholdRoster(supabase, household.id),
  ]);
  const accounts = (accountsData ?? []) as AccountRow[];
  const fundingAccounts = accounts.filter(
    (account) => account.type !== "joint",
  );
  const generalAccount = accounts.find((account) => account.type === "joint");
  const balanceMovements = (balanceData ?? []) as BalanceMovement[];
  const expenseMovements = (expenseData ?? []) as ExpenseMovement[];
  // Same rule as the household summary: the top total only ever mixes accounts in the base
  // currency — an account in another currency is still listed below (in its own currency), just
  // not folded into this sum, since adding cents across currencies would be meaningless.
  const baseFundingAccounts = fundingAccounts.filter((account) => account.currency === household.baseCurrency);
  const baseAccountIds = new Set(baseFundingAccounts.map((account) => account.id));
  const totalBalance = baseFundingAccounts.reduce(
    (total, account) =>
      total +
      calculateAccountBalance(account.id, balanceMovements),
    0,
  );
  const totalExpenses = expenseMovements
    .filter((movement) => baseAccountIds.has(movement.account_id))
    .reduce((total, movement) => total + movement.amount_cents, 0);
  const totalBalanceLabel =
    totalBalance > 0
      ? "Saldo positivo"
      : totalBalance < 0
        ? "Saldo negativo"
        : "En equilibrio";
  return (
    <>
      <div>
        <div>
          <p className="text-sm font-bold uppercase">Fondos compartidos</p>
          <h1 className="mt-1 text-3xl font-black">Cuentas conjuntas</h1>
          <p className="mt-2 max-w-2xl text-(--muted)">
            Separá efectivo, banco, tarjetas o inversiones y elegí de dónde
            entra o sale cada movimiento.
          </p>
        </div>
      </div>
      <section className="card mt-7 overflow-hidden">
        <div className="grid gap-6 p-6 md:grid-cols-[1.2fr_.8fr] md:items-end">
          <div>
            <p className="w-fit bg-(--highlight) px-1 text-xs font-black uppercase tracking-wide">
              {generalAccount?.name ?? "Cuenta conjunta general"}
            </p>
            <p
              className={`mt-3 text-5xl font-black ${totalBalance < 0 ? "text-(--danger)" : "text-(--success)"}`}
            >
              {totalBalance > 0 ? "+" : ""}
              {formatMoney(totalBalance, household.baseCurrency)}
            </p>
            <p className="mt-2 text-xs font-bold uppercase tracking-wide text-(--muted)">
              {totalBalanceLabel} · {baseFundingAccounts.length}{" "}
              {baseFundingAccounts.length === 1
                ? "cuenta operativa activa"
                : "cuentas operativas activas"} en {household.baseCurrency}
            </p>
          </div>
          <StatTile
            label={`Gasto conjunto · ${monthName}`}
            value={formatMoney(totalExpenses, household.baseCurrency)}
            detail={`Acumulado entre las cuentas operativas en ${household.baseCurrency}.`}
            tone="coral"
          />
        </div>
      </section>
      <div className="mt-7">
        <h2 className="text-xl font-black">Cuentas operativas</h2>
        <p className="mt-1 text-sm text-(--muted)">
          Aquí se discrimina de dónde entra o sale el dinero.
        </p>
        <div className="mt-4 grid gap-5 lg:grid-cols-2">
          {fundingAccounts.map((account) => {
            const accountMovements = balanceMovements.filter(
              (movement) => movement.account_id === account.id,
            );
            const allIncome = accountMovements
              .filter((movement) => movement.type === "income")
              .reduce((sum, movement) => sum + movement.amount_cents, 0);
            const allExpenses = accountMovements
              .filter((movement) => movement.type === "expense")
              .reduce((sum, movement) => sum + movement.amount_cents, 0);
            const balance = calculateAccountBalance(account.id, balanceMovements);
            const expenses = calculateParticipantExpenses(
              account.id,
              expenseMovements,
            );
            const balanceLabel =
              balance > 0
                ? "Saldo positivo"
                : balance < 0
                  ? "Saldo negativo"
                  : "En equilibrio";
            const floatingImage = FLOATING_ACCOUNT_IMAGES[account.type];
            const hasMovements = accountMovements.length > 0;
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
                      <span className="grid size-11 place-items-center rounded-xl bg-(--lime)">
                        <AccountIcon type={account.type} />
                      </span>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-(--pink) px-2.5 py-1 text-xs font-bold">
                        {typeNames[account.type] ?? "Conjunta"}
                      </span>
                      {account.currency !== household.baseCurrency && (
                        <span className="rounded-full bg-(--blue) px-2.5 py-1 text-xs font-bold">{account.currency}</span>
                      )}
                      {fundingAccounts.length > 1 && (
                        <DeleteAccountButton id={account.id} name={account.name} action={archiveSharedAccount} />
                      )}
                    </div>
                  </div>
                  <h3 className="mt-5 text-lg font-black">{account.name}</h3>
                  <p
                    className={`mt-1 text-4xl font-black ${balance < 0 ? "text-(--danger)" : "text-(--success)"}`}
                  >
                    {balance > 0 ? "+" : ""}
                    {formatMoney(balance, account.currency)}
                  </p>
                  <p className="mt-1 text-xs font-bold uppercase tracking-wide text-(--muted)">
                    {balanceLabel} actual
                  </p>
                  <p className="mt-3 text-xs text-(--muted)">
                    Ingresos registrados {formatMoney(allIncome, account.currency)} − gastos registrados {formatMoney(allExpenses, account.currency)}
                  </p>
                </div>
                <div className="border-t border-(--ink)/15 bg-(--highlight) p-5">
                  <p className="text-xs font-black uppercase tracking-wide">
                    Gasto del mes · {monthName}
                  </p>
                  <div className="mt-3 space-y-2">
                    {members.map((member) => (
                      <div
                        key={member.userId}
                        className="flex items-center justify-between gap-3"
                      >
                        <span className="truncate text-sm font-bold">
                          {member.displayName}
                        </span>
                        <span className="text-sm font-black">
                          {formatMoney(expenses.get(member.userId) ?? 0, account.currency)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <details className="border-t border-(--ink)/15 bg-white p-5">
                  <summary className="cursor-pointer text-sm font-black">Editar cuenta</summary>
                  <form action={updateSharedAccount} className="mt-4 grid gap-3 sm:grid-cols-2">
                    <input type="hidden" name="id" value={account.id} />
                    <label>
                      <span className="label">Nombre</span>
                      <input className="field" name="name" defaultValue={account.name} required maxLength={80} />
                    </label>
                    <label>
                      <span className="label">Tipo</span>
                      <select className="field" name="type" defaultValue={account.type}>
                        <option value="cash">Efectivo</option>
                        <option value="bank">Banco</option>
                        <option value="card">Tarjeta</option>
                        <option value="savings">Ahorro</option>
                        <option value="investment">Inversión</option>
                      </select>
                    </label>
                    <label>
                      <span className="label">Moneda</span>
                      {hasMovements ? (
                        <>
                          <select className="field" disabled defaultValue={account.currency}>
                            {SUPPORTED_CURRENCIES.map((code) => <option key={code} value={code}>{code}</option>)}
                          </select>
                          <input type="hidden" name="currency" value={account.currency} />
                        </>
                      ) : (
                        <select className="field" name="currency" defaultValue={account.currency}>
                          {SUPPORTED_CURRENCIES.map((code) => <option key={code} value={code}>{code}</option>)}
                        </select>
                      )}
                    </label>
                    <Button type="submit" size="sm" className="self-end">Guardar cambios</Button>
                    <p className="text-xs text-(--muted) sm:col-span-2">El saldo cambia al registrar, editar o eliminar movimientos — usa «Ajustar saldo» aquí abajo si necesitas corregirlo de una vez. {hasMovements ? "La moneda quedó bloqueada porque esta cuenta ya tiene movimientos — para cambiarla hay que eliminar la cuenta y crearla de nuevo." : "La moneda no se puede cambiar una vez que la cuenta tenga movimientos."}</p>
                  </form>
                </details>
                <details className="border-t border-(--ink)/15 bg-white p-5">
                  <summary className="cursor-pointer text-sm font-black">Ajustar saldo</summary>
                  <form action={adjustSharedAccountBalance} className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                    <input type="hidden" name="id" value={account.id} />
                    <label>
                      <span className="label">Saldo real (según el banco)</span>
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
          {!fundingAccounts.length && (
            <div className="card">
              <EmptyState
                image="/bank-building.png"
                title="Aún no hay cuentas operativas"
                description="Crea efectivo, banco, tarjeta u otra cuenta para poder registrar nuevos movimientos."
              />
            </div>
          )}
        </div>
      </div>
      <section className="card mt-7 max-w-3xl p-6">
        <h2 className="text-xl font-black">Crear otra cuenta conjunta</h2>
        <p className="mt-1 text-sm text-(--muted)">
          Si arranca en cero, deja el saldo inicial vacío. Si ya tiene dinero, indícalo y quedará
          registrado como el movimiento «Nueva cuenta creada».
        </p>
        <form
          action={createSharedAccount}
          className="mt-6 grid gap-4 sm:grid-cols-2"
        >
          <label>
            <span className="label">Nombre</span>
            <input
              className="field"
              name="name"
              required
              maxLength={80}
              placeholder="Efectivo de casa"
            />
          </label>
          <label>
            <span className="label">Tipo de cuenta</span>
            <select className="field" name="type">
              <option value="cash">Efectivo</option>
              <option value="bank">Banco</option>
              <option value="card">Tarjeta</option>
              <option value="savings">Ahorro</option>
              <option value="investment">Inversión</option>
            </select>
          </label>
          <label>
            <span className="label">Moneda</span>
            <select className="field" name="currency" defaultValue={household.baseCurrency}>
              {SUPPORTED_CURRENCIES.map((code) => <option key={code} value={code}>{code}</option>)}
            </select>
          </label>
          <label>
            <span className="label">Saldo inicial (opcional)</span>
            <input className="field" name="initialBalance" inputMode="decimal" placeholder="0,00" />
          </label>
          <Button type="submit" className="self-start sm:self-end">
            Crear cuenta conjunta
          </Button>
          <p className="text-xs text-(--muted) sm:col-span-2">
            Si la moneda no es {household.baseCurrency}, esta cuenta quedará aparte del resumen general (se muestra en su propia moneda, sin convertir).
          </p>
        </form>
      </section>
      <section className="card mt-7 flex max-w-2xl flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3">
          <Image src="/private.png" alt="" width={32} height={32} className="size-6 shrink-0 object-contain" />
          <div>
            <h2 className="font-black">¿Quieres gestionar dinero solo tuyo?</h2>
            <p className="mt-1 text-sm text-(--muted)">
              Crea cuentas y movimientos privados en un espacio separado.
            </p>
          </div>
        </div>
        <LinkButton href="/app/personal" size="sm">
          Mi espacio <ArrowRight size={17} />
        </LinkButton>
      </section>
    </>
  );
}
