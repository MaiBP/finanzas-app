"use client";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { formatMoney } from "@/lib/finance/money";

export function CategoryChart({ data }: { data: { name: string; value: number }[] }) {
  if (!data.length) return <div className="grid h-56 place-items-center text-sm text-[#6c7f7a]">Todavía no hay gastos este mes.</div>;
  return <div className="h-56 w-full"><ResponsiveContainer><BarChart data={data} margin={{top:10,right:0,left:0,bottom:0}}><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize:11,fill:"#6c7f7a"}}/><Tooltip formatter={(value)=>formatMoney(Number(value))} cursor={{fill:"#f3f1e9"}}/><Bar dataKey="value" fill="#26725c" radius={[8,8,2,2]}/></BarChart></ResponsiveContainer></div>;
}
