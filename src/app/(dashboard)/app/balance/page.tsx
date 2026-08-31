import { MemberFinancePie } from "@/components/charts/member-finance-pie";
import { getCurrentHousehold } from "@/lib/household";
import {
  calculateMemberSummary,
  type MemberMovement,
} from "@/lib/finance/member-summary";
import { formatMoney } from "@/lib/finance/money";
import { StatTile } from "@/components/ui/stat-tile";
import { getHouseholdRoster } from "@/services/household-roster";

// --lilac deliberately excluded here: it's the same Barn Red as --danger, and "Gastos" below is
// rendered in --danger — on a --lilac row that text would be invisible (same color on itself).
const memberTones = ["bg-(--pink)", "bg-(--blue)", "bg-(--lime)", "bg-(--expense)", "bg-(--savings)"];

export default async function BalancePage() {
  const { supabase, household } = await getCurrentHousehold();
  if (!household) return null;
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const start = `${month}-01`;
  const end = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 1)).toISOString().slice(0, 10);
  const monthName = new Intl.DateTimeFormat("es-ES", { month: "long" }).format(now);
  // An archived account's past activity drops out of every other total in the app (see the
  // dashboards and the bot's query-service) — this page must match, or a deleted account's
  // income/expenses would keep showing up in "Ingresos del mes"/"Gastos del mes" forever.
  const [members, { data: accountsData }] = await Promise.all([
    getHouseholdRoster(supabase, household.id),
    supabase.from("accounts").select("id").eq("household_id", household.id).eq("is_shared", true).neq("type", "joint").is("archived_at", null),
  ]);
  const activeAccountIds = (accountsData ?? []).map((account) => (account as { id: string }).id);
  const { data: movementData } = activeAccountIds.length
    ? await supabase
        .from("transactions")
        .select("created_by,type,amount_cents")
        .eq("household_id", household.id)
        .eq("scope", "shared")
        .eq("status", "confirmed")
        .in("account_id", activeAccountIds)
        .gte("transaction_date", start)
        .lt("transaction_date", end)
    : { data: [] as MemberMovement[] };
  const movements = (movementData ?? []) as MemberMovement[];
  const totals = calculateMemberSummary(movements);
  const totalExpenses = movements
    .filter((item) => item.type === "expense")
    .reduce((sum, item) => sum + item.amount_cents, 0);
  const totalIncome = movements
    .filter((item) => item.type === "income")
    .reduce((sum, item) => sum + item.amount_cents, 0);
  const pieData = members.map((member) => ({
    name: member.displayName,
    value: totals.get(member.userId)?.expenses ?? 0,
  }));
  return (
    <>
      <div>
        <div>
          <p className="text-sm font-bold uppercase">Participación · {monthName}</p>
          <h1 className="mt-1 text-3xl font-black">Balance</h1>
          <p className="mt-2 text-(--muted)">
            Ingresos y gastos compartidos registrados por cada persona.
          </p>
        </div>
      </div>
      <section className="mt-7 grid gap-4 sm:grid-cols-2">
        <StatTile label="Ingresos del mes" value={formatMoney(totalIncome)} tone="green" image="/incoming-bag.png" />
        <StatTile label="Gastos del mes" value={formatMoney(totalExpenses)} tone="coral" image="/money-wings.png" />
      </section>
      <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_.9fr]">
        <article className="card min-w-0 p-6">
          <h2 className="text-xl font-black">Detalle por persona</h2>
          <div className="mt-5 space-y-2.5">
            {members.map((member, index) => {
              const values = totals.get(member.userId) ?? {
                expenses: 0,
                income: 0,
              };
              const name = member.displayName;
              return (
                <div
                  key={member.userId}
                  className={`flex items-center gap-3 rounded-xl p-3 ${memberTones[index % memberTones.length]}`}
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white text-sm font-black">
                    {name.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black">{name}</p>
                    <div className="mt-0.5 flex gap-4 text-xs">
                      <span>
                        Ingresos <b className="text-(--ink)">{formatMoney(values.income)}</b>
                      </span>
                      <span>
                        Gastos <b className="text-(--danger)">{formatMoney(values.expenses)}</b>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-5 text-xs text-(--muted)">
            Los movimientos se atribuyen a quien los registró. Un extracto
            importado queda asociado a la persona que lo subió.
          </p>
        </article>
        <article className="card min-w-0 p-6">
          <h2 className="text-xl font-black">Reparto de gastos</h2>
          <p className="mt-1 text-sm text-(--muted)">
            Participación sobre los gastos compartidos del mes corriente.
          </p>
          <MemberFinancePie data={pieData} />
        </article>
      </section>
    </>
  );
}
