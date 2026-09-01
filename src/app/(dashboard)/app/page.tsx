import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, Plus } from "lucide-react";
import { getCurrentHousehold } from "@/lib/household";
import { formatMoney } from "@/lib/finance/money";
import { StatTile } from "@/components/ui/stat-tile";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/button";
import { CategoryChart } from "@/components/charts/category-chart";
import { getHouseholdFinancialInsight } from "@/services/financial-insights";
import { groupCategoryChartData } from "@/lib/finance/category-chart";
import { calculateAccountBalance } from "@/lib/finance/account-overview";
import { decryptField } from "@/lib/security/field-encryption";

type DashboardRow = {
  id: string;
  type: "expense" | "income";
  amount_cents: number;
  description: string;
  transaction_date: string;
  scope: "personal" | "shared";
  account_id: string;
  categories: { name: string } | null;
};
type DashboardAccount = { id: string; name: string; type: string; currency: string };
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string }>;
}) {
  const params = await searchParams;
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = `${currentYear}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const today = `${currentMonth}-${String(now.getDate()).padStart(2, "0")}`;
  const { supabase, household } = await getCurrentHousehold();
  if (!household) return null;
  const [{ data }, { data: accountsData }, insight] = await Promise.all([
    supabase
      .from("transactions")
      .select(
        "id,type,amount_cents,description,transaction_date,scope,account_id,categories(name)",
      )
      .eq("household_id", household.id)
      .eq("scope", "shared")
      .eq("status", "confirmed")
      .order("transaction_date", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase.from("accounts").select("id,name,type,currency").eq("household_id", household.id).eq("is_shared", true).neq("type", "joint").is("archived_at", null).order("created_at"),
    getHouseholdFinancialInsight(supabase, household.id, currentMonth, household.baseCurrency),
  ]);
  const allRows = ((data ?? []) as unknown as DashboardRow[]).map((row) => ({ ...row, description: decryptField(row.description) }));
  const allAccounts = (accountsData ?? []) as DashboardAccount[];
  // The general summary only ever mixes accounts in the household's base currency — an account in
  // another currency shows up in its own "Otras cuentas" card instead (see below), never summed
  // into these totals, since nothing here converts between currencies.
  const accounts = allAccounts.filter((account) => account.currency === household.baseCurrency);
  const otherAccounts = allAccounts.filter((account) => account.currency !== household.baseCurrency);
  const baseAccountIds = new Set(accounts.map((account) => account.id));
  const rows = allRows.filter((row) => baseAccountIds.has(row.account_id));
  const otherAccountBalances = otherAccounts.map((account) => ({
    name: account.name,
    currency: account.currency,
    balance: calculateAccountBalance(account.id, allRows),
  }));
  const currentRows = rows.filter((row) => row.transaction_date.startsWith(currentMonth));
  const currentYearRows = rows.filter(
    (row) => row.transaction_date.startsWith(`${currentYear}-`) && row.transaction_date <= today,
  );
  const income = currentRows
    .filter((r) => r.type === "income")
    .reduce((s, r) => s + r.amount_cents, 0);
  const expenses = currentRows
    .filter((r) => r.type === "expense")
    .reduce((s, r) => s + r.amount_cents, 0);
  const annualIncome = currentYearRows
    .filter((r) => r.type === "income")
    .reduce((s, r) => s + r.amount_cents, 0);
  const annualExpenses = currentYearRows
    .filter((r) => r.type === "expense")
    .reduce((s, r) => s + r.amount_cents, 0);
  const currentBalance = accounts.reduce((total, account) => total + calculateAccountBalance(account.id, rows), 0);
  const accountBalances = accounts.map((account) => ({
    label: account.name,
    value: formatMoney(calculateAccountBalance(account.id, rows), household.baseCurrency),
  }));
  const byCategory = new Map<string, number>();
  currentRows
    .filter((r) => r.type === "expense")
    .forEach((r) => {
      const name = r.categories?.name ?? "Otros";
      byCategory.set(name, (byCategory.get(name) ?? 0) + r.amount_cents);
    });
  const chart = groupCategoryChartData(
    [...byCategory].map(([name, value]) => ({ name, value })),
  );
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-(--muted)">Resumen del hogar</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight md:text-4xl">
            Así están nuestras finanzas
          </h1>
        </div>
        <div className="flex gap-3">
          <LinkButton href="/app/movimientos/nuevo" size="sm">
            <Plus size={18} /> <span className="hidden sm:inline">Añadir</span>
          </LinkButton>
        </div>
      </div>
      {params.created && (
        <p className="mt-5 rounded-xl bg-(--lime) p-3 text-sm font-bold text-(--ink)">
          Movimiento guardado y resumen actualizado.
        </p>
      )}
      <section className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {/* Saldo actual and the behavior insight have variable-length content (account
            breakdown, insight sentence) that can grow much taller than their row-mate on the
            2-column mobile grid, stretching the shorter card and leaving uneven blank space —
            give both the full row on mobile so only same-height cards ever share a row. */}
        <div className="col-span-2 lg:col-span-1">
          <StatTile
            label="Saldo actual"
            value={formatMoney(currentBalance, household.baseCurrency)}
            tone="plain"
            detail="Según movimientos registrados"
            image="/piggy-bank.png"
            breakdown={accountBalances}
          />
        </div>
        <StatTile
          label="Ingresos del mes"
          value={formatMoney(income, household.baseCurrency)}
          tone="green"
          detail={`Acumulado ${currentYear}: ${formatMoney(annualIncome, household.baseCurrency)}`}
          image="/incoming-bag.png"
        />
        <StatTile
          label="Gastos del mes"
          value={formatMoney(expenses, household.baseCurrency)}
          tone="coral"
          detail={`Acumulado ${currentYear}: ${formatMoney(annualExpenses, household.baseCurrency)}`}
          image="/money-wings.png"
        />
        <div className="col-span-2 lg:col-span-1">
          <StatTile
            label={insight.label}
            value={insight.message}
            tone="lilac"
            detail={insight.detail}
            image="/writing-hand.png"
            compact
          />
        </div>
      </section>
      <section className="mt-6 grid gap-6 lg:grid-cols-[1.35fr_.9fr]">
        {/* min-w-0 on both grid items: without it, a wide child (the chart's SVG, a long
            description) can force its whole track past the viewport instead of shrinking to it —
            the classic grid/flex overflow trap. */}
        <article className="card min-w-0 p-5 md:p-7">
          <div>
            <h2 className="text-lg font-black">Gastos del mes por categoría</h2>
            <p className="text-sm text-(--muted)">
              Distribución del mes corriente
            </p>
          </div>
          <CategoryChart data={chart} />
        </article>
        <article className="card min-w-0 p-5 md:p-7">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black">Últimos movimientos</h2>
              <p className="text-sm text-(--muted)">
                Los más recientes, sin importar el mes
              </p>
            </div>
            <Link
              href="/app/movimientos"
              className="text-sm font-bold text-(--ink) hover:underline"
            >
              Ver todos
            </Link>
          </div>
          <div className="mt-5 divide-y divide-black/5">
            {rows.slice(0, 6).map((row) => (
              <div key={row.id} className="flex items-center gap-3 py-3">
                <span
                  className={`grid size-10 shrink-0 place-items-center rounded-xl ${row.type === "expense" ? "bg-(--pink) text-(--danger)" : "bg-(--lime) text-(--ink)"}`}
                >
                  {row.type === "expense" ? (
                    <ArrowUpRight size={18} />
                  ) : (
                    <ArrowDownLeft size={18} />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">
                    {row.description}
                  </p>
                  <p className="text-xs text-(--muted)">
                    {row.categories?.name ?? "Sin categoría"}
                  </p>
                </div>
                <b className="text-sm">
                  {row.type === "expense" ? "−" : "+"}
                  {formatMoney(row.amount_cents, household.baseCurrency)}
                </b>
              </div>
            ))}
            {!rows.length && (
              <EmptyState
                image="/writing-hand.png"
                title="Aún no hay movimientos"
                description="El primero se apunta en un minuto."
                action={{ label: "Añadir movimiento", href: "/app/movimientos/nuevo" }}
              />
            )}
          </div>
        </article>
      </section>
      {otherAccountBalances.length > 0 && (
        <section className="card mt-6 p-5 md:p-7">
          <h2 className="text-lg font-black">Otras cuentas</h2>
          <p className="text-sm text-(--muted)">
            En otra moneda — no suman al resumen general, cada una se muestra en la suya.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {otherAccountBalances.map((account) => (
              <div key={account.name} className="rounded-xl border border-(--ink)/15 p-4">
                <p className="truncate text-sm font-bold">{account.name}</p>
                <p className={`mt-1 text-xl font-black ${account.balance < 0 ? "text-(--danger)" : "text-(--success)"}`}>
                  {formatMoney(account.balance, account.currency)}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
