"use client";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { formatMoney } from "@/lib/finance/money";

const colors = ["#e19bf5", "#73c8dc", "#87cd64", "#ff6e7d", "#7da0ff"];

export function MemberFinancePie({
  data,
}: {
  data: { name: string; value: number }[];
}) {
  const visible = data.filter((item) => item.value > 0);
  if (!visible.length)
    return (
      <div className="grid h-64 place-items-center text-sm text-[#6c7f7a]">
        No hay gastos compartidos en este mes.
      </div>
    );
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={visible}
            dataKey="value"
            nameKey="name"
            innerRadius={54}
            outerRadius={92}
            paddingAngle={2}
            stroke="#3a3434"
            strokeWidth={1}
          >
            {visible.map((item, index) => (
              <Cell key={item.name} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => formatMoney(Number(value))} />
          <Legend iconType="circle" />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
