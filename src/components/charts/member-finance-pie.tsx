"use client";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatMoney } from "@/lib/finance/money";

const colors = ["var(--lilac)", "var(--blue)", "var(--lime)", "var(--expense)", "var(--savings)"];

export function MemberFinancePie({
  data,
}: {
  data: { name: string; value: number }[];
}) {
  const visible = data.filter((item) => item.value > 0);
  if (!visible.length)
    return (
      <div className="grid h-56 place-items-center text-sm text-(--muted)">
        No hay gastos compartidos en este mes.
      </div>
    );
  const total = visible.reduce((sum, item) => sum + item.value, 0);
  return (
    <div>
      <div className="relative h-56 w-full min-w-0 overflow-hidden">
        <ResponsiveContainer width="99%">
          <PieChart>
            <Pie
              data={visible}
              dataKey="value"
              nameKey="name"
              innerRadius={58}
              outerRadius={86}
              paddingAngle={3}
              stroke="var(--ink)"
              strokeWidth={1}
            >
              {visible.map((item, index) => (
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
      <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs font-bold">
        {visible.map((item, index) => (
          <span key={item.name} className="flex items-center gap-1.5">
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: colors[index % colors.length] }}
            />
            {item.name}
          </span>
        ))}
      </div>
    </div>
  );
}
