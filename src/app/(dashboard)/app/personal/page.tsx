import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, Plus } from "lucide-react";
import { getCurrentHousehold } from "@/lib/household";
import { formatMoney } from "@/lib/finance/money";
import { StatTile } from "@/components/ui/stat-tile";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/button";
import { CategoryChart } from "@/components/charts/category-chart";
import { getPersonalFinancialInsight } from "@/services/financial-insights";
import { groupCategoryChartData } from "@/lib/finance/category-chart";
import { calculateAccountBalance } from "@/lib/finance/account-overview";
import { decryptField } from "@/lib/security/field-encryption";

type PersonalRow = {
  id: string;
  type: "expense" | "income";
  amount_cents: number;
  description: string;
  transaction_date: string;
  account_id: string;
  categories: { name: string } | null;
};
type PersonalAccount = { id: string; name: string; type: string };

export default async function PersonalSummaryPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string }>;
}) {
  const params = await searchParams;
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = `${currentYear}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const today = `${currentMonth}-${String(now.getDate()).padStart(2, "0")}`;
  const { supabase, user, household } = await getCurrentHousehold();
  if (!household) return null;
  const [{ data }, { data: accountsData }, { data: profile }, insight] = await Promise.all([
    supabase
      .from("transactions")
      .select("id,type,amount_cents,description,transaction_date,account_id,categories(name)")
      .eq("household_id", household.id)
      .eq("created_by", user.id)
      .eq("scope", "personal")
      .eq("status", "confirmed")
      .order("transaction_date", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase.from("accounts").select("id,name,type").eq("household_id", household.id).eq("owner_user_id", user.id).eq("is_shared", false).is("archived_at", null).order("created_at"),
    supabase.from("profiles").select("personal_space_name").eq("id", user.id).maybeSingle(),
    getPersonalFinancialInsight(supabase, user.id, household.id, currentMonth),
  ]);
  const rows = ((data ?? []) as unknown as PersonalRow[]).map((row) => ({ ...row, description: decryptField(row.description) }));
  const accounts = (accountsData ?? []) as PersonalAccount[];
  const personalSpaceName = profile?.personal_space_name ?? "Mi espacio";
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
    value: formatMoney(calculateAccountBalance(account.id, rows)),
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
          <p className="text-sm font-bold text-(--muted)">Espacio personal · privado para ti</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight md:text-4xl">
            {personalSpaceName}
          </h1>
        </div>
        <div className="flex gap-3">
          <LinkButton href="/app/personal/movimientos/nuevo" size="sm">
            <Plus size={18} /> <span className="hidden sm:inline">Añadir</span>
          </LinkButton>
        </div>
      </div>
      {params.created && (
        <p className="mt-5 rounded-xl bg-(--lime) p-3 text-sm font-bold text-(--ink)">
          Movimiento personal guardado.
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
            value={formatMoney(currentBalance)}
            tone="plain"
            detail="Según movimientos registrados"
            image="/piggy-bank.png"
            breakdown={accountBalances}
          />
        </div>
        <StatTile
          label="Ingresos del mes"
          value={formatMoney(income)}
          tone="green"
          detail={`Acumulado ${currentYear}: ${formatMoney(annualIncome)}`}
          image="/incoming-bag.png"
        />
        <StatTile
          label="Gastos del mes"
          value={formatMoney(expenses)}
          tone="coral"
          detail={`Acumulado ${currentYear}: ${formatMoney(annualExpenses)}`}
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
              href="/app/personal/movimientos"
              className="text-sm font-bold text-(--ink) hover:underline"
            >
              Ver todos
            </Link>
          </div>
          <div className="mt-5 divide-y divide-black/5">
            {rows.slice(0, 6).map((row) => (
              <div key={row.id} className="flex items-center gap-3 py-3">
                <span
                  className={`grid size-10 shrink-0 place-items-center rounded-xl ${row.type === "expense" ? "bg-(--pink) text-[#b34f36]" : "bg-(--lime) text-(--ink)"}`}
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
                  {formatMoney(row.amount_cents)}
                </b>
              </div>
            ))}
            {!rows.length && (
              <EmptyState
                image="/writing-hand.png"
                title="Aún no hay movimientos"
                description="El primero se apunta en un minuto."
                action={{ label: "Añadir movimiento", href: "/app/personal/movimientos/nuevo" }}
              />
            )}
          </div>
        </article>
      </section>
    </>
  );
}
