import { formatMoney } from "@/lib/finance/money";

interface DbClient { from: (table: string) => ReturnType<import("@supabase/supabase-js").SupabaseClient["from"]> }

export async function getMonthSummary(db: DbClient, householdId: string, now = new Date()) {
  const month = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
  const next = new Date(Date.UTC(now.getFullYear(),now.getMonth()+1,1)).toISOString().slice(0,10);
  const { data, error } = await db.from("transactions").select("type,amount_cents").eq("household_id",householdId).eq("status","confirmed").gte("transaction_date",`${month}-01`).lt("transaction_date",next);
  if(error) throw error; const rows=(data??[]) as {type:string;amount_cents:number}[];
  const income=rows.filter(x=>x.type==="income").reduce((s,x)=>s+x.amount_cents,0); const expenses=rows.filter(x=>x.type==="expense").reduce((s,x)=>s+x.amount_cents,0);
  return `Este mes lleváis ${formatMoney(income)} de ingresos y ${formatMoney(expenses)} de gastos. El ahorro neto es ${formatMoney(income-expenses)}.`;
}

export async function getRecentTransactions(db: DbClient, householdId: string, limit=5) {
  const {data,error}=await db.from("transactions").select("type,amount_cents,description,transaction_date").eq("household_id",householdId).eq("status","confirmed").order("transaction_date",{ascending:false}).limit(limit);
  if(error)throw error; const rows=(data??[]) as {type:string;amount_cents:number;description:string;transaction_date:string}[];
  if(!rows.length)return "Todavía no hay movimientos confirmados.";
  return rows.map(x=>`${x.type==="expense"?"−":"+"}${formatMoney(x.amount_cents)} · ${x.description} (${x.transaction_date})`).join("\n");
}
