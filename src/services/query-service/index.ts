import { formatMoney } from "@/lib/finance/money";

interface DbClient { from: (table: string) => ReturnType<import("@supabase/supabase-js").SupabaseClient["from"]> }

export function accessibleFinanceFilter(userId: string) {
  return `scope.eq.shared,and(scope.eq.personal,created_by.eq.${userId})`;
}

export type FinanceScope = "shared" | "personal" | "combined";

export async function getMonthSummary(db: DbClient, householdId: string, userId: string, now = new Date(), scope: FinanceScope = "combined") {
  const month = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
  const next = new Date(Date.UTC(now.getFullYear(),now.getMonth()+1,1)).toISOString().slice(0,10);
  let query = db.from("transactions").select("type,amount_cents,scope").eq("household_id",householdId).eq("status","confirmed").gte("transaction_date",`${month}-01`).lt("transaction_date",next);
  query=scope==="shared"?query.eq("scope","shared"):scope==="personal"?query.eq("scope","personal").eq("created_by",userId):query.or(accessibleFinanceFilter(userId));
  const { data, error } = await query;
  if(error) throw error;
  const rows=(data??[]) as {type:string;amount_cents:number;scope:"shared"|"personal"}[];
  const totals=(scope:"shared"|"personal",type:"income"|"expense")=>rows.filter(row=>row.scope===scope&&row.type===type).reduce((sum,row)=>sum+row.amount_cents,0);
  const sharedIncome=totals("shared","income"); const sharedExpenses=totals("shared","expense");
  const personalIncome=totals("personal","income"); const personalExpenses=totals("personal","expense");
  if(scope==="shared")return `En el hogar: ${formatMoney(sharedIncome)} de ingresos y ${formatMoney(sharedExpenses)} de gastos. El resultado compartido es ${formatMoney(sharedIncome-sharedExpenses)}.`;
  if(scope==="personal")return `En tu espacio personal: ${formatMoney(personalIncome)} de ingresos y ${formatMoney(personalExpenses)} de gastos. Tu resultado personal es ${formatMoney(personalIncome-personalExpenses)}.`;
  return `En el hogar: ${formatMoney(sharedIncome)} de ingresos y ${formatMoney(sharedExpenses)} de gastos. En tu espacio personal: ${formatMoney(personalIncome)} de ingresos y ${formatMoney(personalExpenses)} de gastos. El resultado combinado es ${formatMoney(sharedIncome+personalIncome-sharedExpenses-personalExpenses)}.`;
}

export async function getRecentTransactions(db: DbClient, householdId: string, userId: string, limit=5, scope: FinanceScope = "combined") {
  let query=db.from("transactions").select("type,amount_cents,description,transaction_date,scope,accounts(name)").eq("household_id",householdId).eq("status","confirmed").order("transaction_date",{ascending:false}).order("created_at",{ascending:false}).limit(limit);
  query=scope==="shared"?query.eq("scope","shared"):scope==="personal"?query.eq("scope","personal").eq("created_by",userId):query.or(accessibleFinanceFilter(userId));
  const {data,error}=await query;
  if(error)throw error;
  const rows=(data??[]) as unknown as {type:string;amount_cents:number;description:string;transaction_date:string;scope:"shared"|"personal";accounts:{name:string}|null}[];
  if(!rows.length)return "Todavía no hay movimientos confirmados.";
  return rows.map(row=>`${row.scope==="shared"?"Conjunto":"Personal"} · ${row.accounts?.name??"Sin cuenta"} · ${row.type==="expense"?"−":"+"}${formatMoney(row.amount_cents)} · ${row.description} (${row.transaction_date})`).join("\n");
}
