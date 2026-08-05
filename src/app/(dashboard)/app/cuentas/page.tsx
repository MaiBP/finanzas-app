import Link from "next/link";
import {
  Archive,
  ArrowRight,
  Banknote,
  CreditCard,
  Landmark,
  PiggyBank,
  TrendingUp,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { getCurrentHousehold } from "@/lib/household";
import { formatMoney } from "@/lib/finance/money";
import {
  calculateAccountBalance,
  calculateParticipantExpenses,
} from "@/lib/finance/account-overview";
import { archiveSharedAccount, createSharedAccount, updateSharedAccount } from "./actions";

type AccountRow = {
  id: string;
  name: string;
  type: string;
  current_balance_cents: number;
};
type BalanceMovement = {
  account_id: string;
  type: "expense" | "income";
  amount_cents: number;
};
type ExpenseMovement = {
  account_id: string;
  paid_by: string;
  amount_cents: number;
};
type MemberRow = {
  user_id: string;
  profiles: { display_name: string | null } | null;
};

function AccountIcon({ type }: { type: string }) {
  if (type === "cash") return <Banknote />;
  if (type === "card") return <CreditCard />;
  if (type === "savings") return <PiggyBank />;
  if (type === "investment") return <TrendingUp />;
  if (type === "bank") return <Landmark />;
  return <WalletCards />;
}
const typeNames: Record<string, string> = {
  joint: "General",
  bank: "Banco",
  card: "Tarjeta",
  cash: "Efectivo",
  savings: "Ahorro",
  investment: "Inversión",
};

export default async function AccountsPage() {
  const { supabase, household } = await getCurrentHousehold();
  if (!household) return null;
  const [
    { data: accountsData },
    { data: balanceData },
    { data: expenseData },
    { data: membersData },
  ] = await Promise.all([
    supabase
      .from("accounts")
      .select("id,name,type,current_balance_cents")
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
      .eq("status", "confirmed"),
    supabase
      .from("household_members")
      .select("user_id,profiles(display_name)")
      .eq("household_id", household.id),
  ]);
  const accounts = (accountsData ?? []) as AccountRow[];
  const fundingAccounts = accounts.filter(
    (account) => account.type !== "joint",
  );
  const generalAccount = accounts.find((account) => account.type === "joint");
  const balanceMovements = (balanceData ?? []) as BalanceMovement[];
  const expenseMovements = (expenseData ?? []) as ExpenseMovement[];
  const members = (membersData ?? []) as unknown as MemberRow[];
  const totalBalance = fundingAccounts.reduce(
    (total, account) =>
      total +
      calculateAccountBalance(
        account.current_balance_cents,
        account.id,
        balanceMovements,
      ),
    0,
  );
  const totalExpenses = expenseMovements.reduce(
    (total, movement) => total + movement.amount_cents,
    0,
  );
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
          <p className="mt-2 max-w-2xl text-[#6c7f7a]">
            Separad efectivo, banco, tarjetas o inversiones y elegid de dónde
            entra o sale cada movimiento.
          </p>
        </div>
      </div>
      <section className="card mt-7 overflow-hidden">
        <div className="grid gap-6 p-6 md:grid-cols-[1.2fr_.8fr] md:items-end">
          <div>
            <p className="w-fit bg-[#ffff50] px-1 text-xs font-black uppercase tracking-wide">
              {generalAccount?.name ?? "Cuenta conjunta general"}
            </p>
            <p
              className={`mt-3 text-5xl font-black ${totalBalance < 0 ? "text-[#b34f36]" : "text-[#2e7d32]"}`}
            >
              {totalBalance > 0 ? "+" : ""}
              {formatMoney(totalBalance)}
            </p>
            <p className="mt-2 text-xs font-bold uppercase tracking-wide text-[#6e6464]">
              {totalBalanceLabel} · {fundingAccounts.length}{" "}
              {fundingAccounts.length === 1
                ? "cuenta operativa activa"
                : "cuentas operativas activas"}
            </p>
          </div>
          <div className="rounded-sm border border-[#3a3434]/20 bg-[#ff6e7d] p-5">
            <p className="w-fit bg-[#ffff50] px-1 text-xs font-black uppercase tracking-wide">
              Gasto conjunto acumulado
            </p>
            <p className="mt-3 text-3xl font-black">
              {formatMoney(totalExpenses)}
            </p>
            <p className="mt-1 text-xs text-[#3a3434]/75">
              Acumulado entre todas las cuentas operativas.
            </p>
          </div>
        </div>
      </section>
      <div className="mt-7">
        <h2 className="text-xl font-black">Cuentas operativas</h2>
        <p className="mt-1 text-sm text-[#6c7f7a]">
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
            const balance = calculateAccountBalance(
              account.current_balance_cents,
              account.id,
              balanceMovements,
            );
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
            return (
              <article className="card overflow-hidden" key={account.id}>
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <span className="grid size-11 place-items-center rounded-xl bg-[#87cd64]">
                      <AccountIcon type={account.type} />
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-[#e19bf5] px-2.5 py-1 text-xs font-bold">
                        {typeNames[account.type] ?? "Conjunta"}
                      </span>
                      {fundingAccounts.length > 1 && (
                        <form action={archiveSharedAccount}>
                          <input type="hidden" name="id" value={account.id} />
                          <button
                            aria-label={`Archivar ${account.name}`}
                            className="rounded-lg p-2"
                          >
                            <Archive size={16} />
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                  <h3 className="mt-5 text-lg font-black">{account.name}</h3>
                  <p
                    className={`mt-1 text-4xl font-black ${balance < 0 ? "text-[#b34f36]" : "text-[#2e7d32]"}`}
                  >
                    {balance > 0 ? "+" : ""}
                    {formatMoney(balance)}
                  </p>
                  <p className="mt-1 text-xs font-bold uppercase tracking-wide text-[#6e6464]">
                    {balanceLabel} actual
                  </p>
                  <p className="mt-3 text-xs text-[#6c7f7a]">
                    Base contable {formatMoney(account.current_balance_cents)} + ingresos{" "}
                    {formatMoney(allIncome)} − gastos {formatMoney(allExpenses)}
                  </p>
                </div>
                <div className="border-t border-[#3a3434]/15 bg-[#ffff50] p-5">
                  <p className="text-xs font-black uppercase tracking-wide">
                    Gasto acumulado
                  </p>
                  <div className="mt-3 space-y-2">
                    {members.map((member) => (
                      <div
                        key={member.user_id}
                        className="flex items-center justify-between gap-3"
                      >
                        <span className="truncate text-sm font-bold">
                          {member.profiles?.display_name ?? "Miembro"}
                        </span>
                        <span className="text-sm font-black">
                          {formatMoney(expenses.get(member.user_id) ?? 0)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <details className="border-t border-[#3a3434]/15 bg-white p-5">
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
                      <span className="label">Saldo actual</span>
                      <input className="field" name="balance" inputMode="decimal" defaultValue={(balance / 100).toFixed(2).replace(".", ",")} required />
                    </label>
                    <button className="self-end rounded-xl px-5 py-3 font-bold">Guardar cambios</button>
                    <p className="text-xs text-[#6c7f7a] sm:col-span-2">El ajuste conserva todos los movimientos históricos y recalibra únicamente la base contable.</p>
                  </form>
                </details>
              </article>
            );
          })}
          {!fundingAccounts.length && (
            <div className="card p-6">
              <p className="font-bold">Aún no hay cuentas operativas.</p>
              <p className="mt-1 text-sm text-[#6c7f7a]">
                Crea efectivo, banco, tarjeta u otra cuenta para poder registrar
                nuevos movimientos.
              </p>
            </div>
          )}
        </div>
      </div>
      <section className="card mt-7 max-w-3xl p-6">
        <h2 className="text-xl font-black">Crear otra cuenta conjunta</h2>
        <p className="mt-1 text-sm text-[#6c7f7a]">
          El saldo inicial sirve como punto de partida; después cambiará según
          los movimientos asignados a esta cuenta.
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
            <span className="label">Saldo inicial</span>
            <input
              className="field"
              name="balance"
              inputMode="decimal"
              placeholder="0,00"
            />
            <span className="mt-1 block text-xs text-[#6c7f7a]">
              Puedes usar un valor negativo para deudas.
            </span>
          </label>
          <button className="self-start rounded-xl px-5 py-3 font-bold sm:self-end">
            Crear cuenta conjunta
          </button>
        </form>
      </section>
      <section className="card mt-7 flex max-w-2xl flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3">
          <UsersRound className="shrink-0" />
          <div>
            <h2 className="font-black">¿Quieres gestionar dinero solo tuyo?</h2>
            <p className="mt-1 text-sm text-[#6c7f7a]">
              Crea cuentas y movimientos privados en un espacio separado.
            </p>
          </div>
        </div>
        <Link
          href="/app/personal"
          className="flex shrink-0 items-center justify-center gap-2 rounded-xl px-5 py-3 font-bold"
        >
          Mi espacio <ArrowRight size={17} />
        </Link>
      </section>
    </>
  );
}
