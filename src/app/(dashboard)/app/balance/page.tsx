import { MemberFinancePie } from "@/components/charts/member-finance-pie";
import { getCurrentHousehold } from "@/lib/household";
import {
  calculateMemberSummary,
  type MemberMovement,
} from "@/lib/finance/member-summary";
import { formatMoney } from "@/lib/finance/money";

type MemberRow = {
  user_id: string;
  profiles: { display_name: string | null } | null;
};

export default async function BalancePage() {
  const { supabase, household } = await getCurrentHousehold();
  if (!household) return null;
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const start = `${month}-01`;
  const end = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 1)).toISOString().slice(0, 10);
  const monthName = new Intl.DateTimeFormat("es-ES", { month: "long" }).format(now);
  const [{ data: membersData }, { data: movementData }] = await Promise.all([
    supabase
      .from("household_members")
      .select("user_id,profiles(display_name)")
      .eq("household_id", household.id),
    supabase
      .from("transactions")
      .select("created_by,type,amount_cents")
      .eq("household_id", household.id)
      .eq("scope", "shared")
      .eq("status", "confirmed")
      .gte("transaction_date", start)
      .lt("transaction_date", end),
  ]);
  const members = (membersData ?? []) as unknown as MemberRow[];
  const movements = (movementData ?? []) as MemberMovement[];
  const totals = calculateMemberSummary(movements);
  const totalExpenses = movements
    .filter((item) => item.type === "expense")
    .reduce((sum, item) => sum + item.amount_cents, 0);
  const totalIncome = movements
    .filter((item) => item.type === "income")
    .reduce((sum, item) => sum + item.amount_cents, 0);
  const pieData = members.map((member) => ({
    name: member.profiles?.display_name ?? "Miembro",
    value: totals.get(member.user_id)?.expenses ?? 0,
  }));
  return (
    <>
      <div>
        <div>
          <p className="text-sm font-bold uppercase">Participación · {monthName}</p>
          <h1 className="mt-1 text-3xl font-black">Balance</h1>
          <p className="mt-2 text-[#6c7f7a]">
            Ingresos y gastos compartidos registrados por cada persona.
          </p>
        </div>
      </div>
      <section className="mt-7 grid gap-4 sm:grid-cols-2">
        <article className="rounded-sm border border-[#3a3434]/20 bg-[#87cd64] p-5">
          <p className="w-fit bg-[#ffff50] px-1 text-xs font-black uppercase">
            Ingresos del mes
          </p>
          <p className="mt-3 text-3xl font-black">{formatMoney(totalIncome)}</p>
        </article>
        <article className="rounded-sm border border-[#3a3434]/20 bg-[#ff6e7d] p-5">
          <p className="w-fit bg-[#ffff50] px-1 text-xs font-black uppercase">
            Gastos del mes
          </p>
          <p className="mt-3 text-3xl font-black">
            {formatMoney(totalExpenses)}
          </p>
        </article>
      </section>
      <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_.9fr]">
        <article className="card p-6">
          <h2 className="text-xl font-black">Detalle por persona</h2>
          <div className="mt-5 space-y-3">
            {members.map((member) => {
              const values = totals.get(member.user_id) ?? {
                expenses: 0,
                income: 0,
              };
              return (
                <div
                  key={member.user_id}
                  className="rounded-xl bg-[#f6f4ec] p-4"
                >
                  <p className="font-black">
                    {member.profiles?.display_name ?? "Miembro"}
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="block text-xs font-bold uppercase text-[#6c7f7a]">
                        Ingresos
                      </span>
                      <b className="text-[#26725c]">
                        {formatMoney(values.income)}
                      </b>
                    </div>
                    <div>
                      <span className="block text-xs font-bold uppercase text-[#6c7f7a]">
                        Gastos
                      </span>
                      <b className="text-[#b34f36]">
                        {formatMoney(values.expenses)}
                      </b>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-5 text-xs text-[#6c7f7a]">
            Los movimientos se atribuyen a quien los registró. Un extracto
            importado queda asociado a la persona que lo subió.
          </p>
        </article>
        <article className="card p-6">
          <h2 className="text-xl font-black">Reparto de gastos</h2>
          <p className="mt-1 text-sm text-[#6c7f7a]">
            Participación sobre los gastos compartidos del mes corriente.
          </p>
          <MemberFinancePie data={pieData} />
        </article>
      </section>
    </>
  );
}
