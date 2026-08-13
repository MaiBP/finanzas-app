"use client";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatMoney } from "@/lib/finance/money";

const colors = ["var(--lilac)", "var(--blue)", "var(--lime)", "var(--expense)", "var(--savings)", "var(--pink)", "var(--highlight)"];

export function CategoryChart({ data }: { data: { name: string; value: number }[] }) {
  if (!data.length) return <div className="grid h-56 place-items-center text-sm text-[#6c7f7a]">Todavía no hay gastos este mes.</div>;
  const total = data.reduce((sum, item) => sum + item.value, 0);
  return (
    <div>
      {/* A pie has a fixed footprint regardless of how many categories there are, unlike a bar
          chart whose width/labels kept growing the card sideways as categories were added. */}
      <div className="relative h-56 w-full min-w-0 overflow-hidden">
        <ResponsiveContainer width="99%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={58} outerRadius={86} paddingAngle={3} stroke="var(--ink)" strokeWidth={1}>
              {data.map((item, index) => (
                <Cell key={item.name} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => formatMoney(Number(value))} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-[10px] font-bold uppercase tracking-wide text-(--muted)">Total</p>
          <p className="text-lg font-black">{formatMoney(total)}</p>
        </div>
      </div>
      <ul className="mt-4 space-y-1.5 text-xs font-bold">
        {data.map((item, index) => (
          <li key={item.name} className="flex min-w-0 items-center gap-2">
            <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} />
            <span className="min-w-0 flex-1 truncate">{item.name}</span>
            <span className="shrink-0">{formatMoney(item.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
