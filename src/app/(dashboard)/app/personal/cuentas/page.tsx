import Image from "next/image";
import { getCurrentHousehold } from "@/lib/household";
import { formatMoney } from "@/lib/finance/money";
import { calculateAccountBalance } from "@/lib/finance/account-overview";
import { adjustAccountBalance, archiveAccount, createAccount, updateAccount } from "../../cuentas/actions";
import { StatTile } from "@/components/ui/stat-tile";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { DeleteAccountButton } from "@/components/accounts/delete-account-button";
import { AccountIcon, FLOATING_ACCOUNT_IMAGES } from "@/components/accounts/account-icon";
import { ACCOUNT_TYPE_LABELS } from "@/lib/finance/account-types";
import { SUPPORTED_CURRENCIES } from "@/lib/finance/currencies";

type AccountRow = { id: string; name: string; type: string; currency: string };
type BalanceMovement = { account_id: string; type: "expense" | "income"; amount_cents: number };
type MonthExpenseRow = { account_id: string; amount_cents: number };

export default async function PersonalAccountsPage() {
  const { supabase, user, household } = await getCurrentHousehold();
  if (!household) return null;
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const nextMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 1)).toISOString().slice(0, 10);
  const [{ data: accountsData }, { data: balanceData }, { data: monthExpenseData }, { data: profile }] = await Promise.all([
    supabase
      .from("accounts")
      .select("id,name,type,currency")
      .eq("household_id", household.id)
      .eq("owner_user_id", user.id)
      .eq("is_shared", false)
      .is("archived_at", null)
      .order("created_at"),
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
    supabase.from("profiles").select("personal_base_currency").eq("id", user.id).maybeSingle(),
  ]);
  const accounts = (accountsData ?? []) as AccountRow[];
  const baseCurrency = profile?.personal_base_currency ?? "EUR";
  const balanceMovements = (balanceData ?? []) as BalanceMovement[];
  const monthExpenseByAccount = new Map<string, number>();
  for (const row of (monthExpenseData ?? []) as MonthExpenseRow[]) {
    monthExpenseByAccount.set(row.account_id, (monthExpenseByAccount.get(row.account_id) ?? 0) + row.amount_cents);
  }
  const baseAccounts = accounts.filter((account) => account.currency === baseCurrency);
  const baseAccountIds = new Set(baseAccounts.map((account) => account.id));
  const totalBalance = baseAccounts.reduce((total, account) => total + calculateAccountBalance(account.id, balanceMovements), 0);
  const totalExpenses = [...monthExpenseByAccount.entries()]
    .filter(([accountId]) => baseAccountIds.has(accountId))
    .reduce((sum, [, value]) => sum + value, 0);
  const totalBalanceLabel = totalBalance > 0 ? "Saldo positivo" : totalBalance < 0 ? "Saldo negativo" : "En equilibrio";
  const monthName = new Intl.DateTimeFormat("es-ES", { month: "long" }).format(now);

  return (
    <>
      <div>
        <p className="text-sm font-bold uppercase">Fondos personales</p>
        <h1 className="mt-1 text-3xl font-black">Cuentas personales</h1>
        <p className="mt-2 max-w-2xl text-(--muted)">
          Separá efectivo, banco, tarjetas o inversiones propias y elegí de dónde entra o sale cada
          movimiento personal.
        </p>
      </div>
      <section className="card mt-7 overflow-hidden">
        <div className="grid gap-6 p-6 md:grid-cols-[1.2fr_.8fr] md:items-end">
          <div>
            <p className="w-fit bg-(--highlight) px-1 text-xs font-black uppercase tracking-wide">
              Saldo personal total
            </p>
            <p className={`mt-3 text-5xl font-black ${totalBalance < 0 ? "text-(--danger)" : "text-(--success)"}`}>
              {totalBalance > 0 ? "+" : ""}
              {formatMoney(totalBalance, baseCurrency)}
            </p>
            <p className="mt-2 text-xs font-bold uppercase tracking-wide text-(--muted)">
              {totalBalanceLabel} · {baseAccounts.length} {baseAccounts.length === 1 ? "cuenta activa" : "cuentas activas"} en {baseCurrency}
            </p>
          </div>
          <StatTile
            label={`Gasto personal · ${monthName}`}
            value={formatMoney(totalExpenses, baseCurrency)}
            detail={`Acumulado entre tus cuentas personales en ${baseCurrency}.`}
            tone="coral"
            image="/money-wings.png"
          />
        </div>
      </section>
      <div className="mt-7">
        <h2 className="text-xl font-black">Cuentas operativas</h2>
        <p className="mt-1 text-sm text-(--muted)">
          Aquí se discrimina de dónde entra o sale tu dinero.
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
                        <span className="grid size-11 place-items-center rounded-xl bg-(--blue)">
                          <AccountIcon type={account.type} />
                        </span>
                      )}
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-(--lilac) px-2.5 py-1 text-xs font-bold">
                          {ACCOUNT_TYPE_LABELS[account.type] ?? "Personal"}
                        </span>
                        {account.currency !== baseCurrency && (
                          <span className="rounded-full bg-(--blue) px-2.5 py-1 text-xs font-bold">{account.currency}</span>
                        )}
                        <DeleteAccountButton id={account.id} name={account.name} action={archiveAccount} />
                      </div>
                    </div>
                    <h3 className="mt-5 text-lg font-black">{account.name}</h3>
                    <p className={`mt-1 text-4xl font-black ${balance < 0 ? "text-(--danger)" : "text-(--success)"}`}>
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
                    <p className="text-xs font-black uppercase tracking-wide">Gasto del mes · {monthName}</p>
                    <p className="mt-1 text-lg font-black">{formatMoney(monthExpense, account.currency)}</p>
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
                description="Creá efectivo, banco, tarjeta u otra cuenta para registrar tus movimientos privados."
              />
            </div>
          )}
        </div>
      </div>
      <section className="card mt-7 max-w-3xl p-6">
        <h2 className="text-xl font-black">Crear otra cuenta personal</h2>
        <p className="mt-1 text-sm text-(--muted)">
          Si arranca en cero, dejá el saldo inicial vacío. Si ya tiene dinero, indicalo y quedará
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
            <span className="label">Moneda</span>
            <select className="field" name="currency" defaultValue={baseCurrency}>
              {SUPPORTED_CURRENCIES.map((code) => <option key={code} value={code}>{code}</option>)}
            </select>
          </label>
          <label>
            <span className="label">Saldo inicial (opcional)</span>
            <input className="field" name="initialBalance" inputMode="decimal" placeholder="0,00" />
          </label>
          <Button type="submit" className="self-start sm:self-end">
            Crear cuenta
          </Button>
          <p className="text-xs text-(--muted) sm:col-span-2">
            Si la moneda no es {baseCurrency}, esta cuenta quedará aparte de tu resumen personal (se muestra en su propia moneda, sin convertir).
          </p>
        </form>
      </section>
    </>
  );
}
