import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, Plus } from "lucide-react";
import { getCurrentHousehold } from "@/lib/household";
import { formatMoney } from "@/lib/finance/money";
import { SummaryCard } from "@/components/dashboard/summary-card";
import { CategoryChart } from "@/components/charts/category-chart";
import { getHouseholdFinancialInsight } from "@/services/financial-insights";
import { groupCategoryChartData } from "@/lib/finance/category-chart";
import { calculateAccountBalance } from "@/lib/finance/account-overview";

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
type DashboardAccount = { id: string; type: string };
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
    supabase.from("accounts").select("id,type").eq("household_id", household.id).eq("is_shared", true).neq("type", "joint").is("archived_at", null),
    getHouseholdFinancialInsight(supabase, household.id, currentMonth),
  ]);
  const rows = (data ?? []) as unknown as DashboardRow[];
  const accounts = (accountsData ?? []) as DashboardAccount[];
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
          <p className="text-sm font-bold text-[#6c7f7a]">Resumen del hogar</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight md:text-4xl">
            Así están vuestras finanzas
          </h1>
        </div>
        <div className="flex gap-3">
          <Link
            href="/app/movimientos/nuevo"
            className="flex items-center gap-2 rounded-xl bg-[#26725c] px-4 py-3 text-sm font-bold text-white"
          >
            <Plus size={18} /> <span className="hidden sm:inline">Añadir</span>
          </Link>
        </div>
      </div>
      {params.created && (
        <p className="mt-5 rounded-xl bg-[#dceee6] p-3 text-sm font-bold text-[#26725c]">
          Movimiento guardado y resumen actualizado.
        </p>
      )}
      <section className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard
          label="Saldo actual"
          value={formatMoney(currentBalance)}
          tone="plain"
          detail="Según movimientos registrados"
        />
        <SummaryCard
          label="Ingresos del mes"
          value={formatMoney(income)}
          tone="green"
          detail={`Acumulado ${currentYear}: ${formatMoney(annualIncome)}`}
        />
        <SummaryCard
          label="Gastos del mes"
          value={formatMoney(expenses)}
          tone="coral"
          detail={`Acumulado ${currentYear}: ${formatMoney(annualExpenses)}`}
        />
        <SummaryCard
          label={insight.label}
          value={insight.message}
          tone="lilac"
          detail={insight.detail}
          compact
        />
      </section>
      <section className="mt-6 grid gap-6 lg:grid-cols-[1.35fr_.9fr]">
        <article className="card p-5 md:p-7">
          <div>
            <h2 className="text-lg font-black">Gastos del mes por categoría</h2>
            <p className="text-sm text-[#6c7f7a]">
              Distribución del mes corriente
            </p>
          </div>
          <CategoryChart data={chart} />
        </article>
        <article className="card p-5 md:p-7">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black">Últimos movimientos</h2>
              <p className="text-sm text-[#6c7f7a]">
                Los más recientes, sin importar el mes
              </p>
            </div>
            <Link
              href="/app/movimientos"
              className="text-sm font-bold text-[#26725c]"
            >
              Ver todos
            </Link>
          </div>
          <div className="mt-5 divide-y divide-black/5">
            {rows.slice(0, 6).map((row) => (
              <div key={row.id} className="flex items-center gap-3 py-3">
                <span
                  className={`grid size-10 shrink-0 place-items-center rounded-xl ${row.type === "expense" ? "bg-[#f7ddd4] text-[#b34f36]" : "bg-[#dceee6] text-[#26725c]"}`}
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
                  <p className="text-xs text-[#6c7f7a]">
                    {row.categories?.name ?? "Sin categoría"}
                  </p>
                </div>
                <b className="text-sm">
                  {row.type === "expense" ? "−" : "+"}
                  {formatMoney(row.amount_cents)}
                </b>
              </div>
            ))}
            {!rows.length && (
              <p className="py-12 text-center text-sm text-[#6c7f7a]">
                Aún no hay movimientos. El primero se apunta en un minuto.
              </p>
            )}
          </div>
        </article>
      </section>
    </>
  );
}
