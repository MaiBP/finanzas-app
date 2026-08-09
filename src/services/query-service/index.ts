import { formatMoney } from "@/lib/finance/money";
import type { FinancialAction } from "@/services/financial-message-parser/schema";

interface DbClient {
  from: (table: string) => ReturnType<import("@supabase/supabase-js").SupabaseClient["from"]>;
}

export type FinanceScope = "shared" | "personal" | "combined";
export type FinanceQuery = Extract<FinancialAction, { action: "query_finances" }> ["data"];
type QueryFilters = FinanceQuery["filters"];
type QueryRow = {
  type: "expense" | "income";
  amount_cents: number;
  description: string;
  transaction_date: string;
  created_by: string;
  scope: "shared" | "personal";
  categories: { name: string } | null;
  accounts: { name: string } | null;
};
type PeriodRange = { from: string | null; to: string | null; label: string };

export function accessibleFinanceFilter(userId: string) {
  return `scope.eq.shared,and(scope.eq.personal,created_by.eq.${userId})`;
}

function madridToday(now: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function shiftDays(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function shiftMonth(month: string, offset: number) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(Date.UTC(year, monthNumber - 1 + offset, 1)).toISOString().slice(0, 7);
}

function monthEnd(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(Date.UTC(year, monthNumber, 0)).toISOString().slice(0, 10);
}

function displayPeriod(from: string | null, to: string | null) {
  if (!from && !to) return "todo el historial";
  if (from && to) return from === to ? `el ${from}` : `del ${from} al ${to}`;
  return from ? `desde el ${from}` : `hasta el ${to}`;
}

export function resolveFinancePeriod(filters: QueryFilters, now = new Date()): PeriodRange {
  const today = madridToday(now);
  const currentMonth = today.slice(0, 7);
  if (filters.date_from || filters.date_to) {
    return {
      from: filters.date_from,
      to: filters.date_to,
      label: displayPeriod(filters.date_from, filters.date_to),
    };
  }
  if (filters.month) {
    const to = filters.month === currentMonth ? today : monthEnd(filters.month);
    return { from: `${filters.month}-01`, to, label: displayPeriod(`${filters.month}-01`, to) };
  }
  switch (filters.period) {
    case "current_year":
      return { from: `${today.slice(0, 4)}-01-01`, to: today, label: `${today.slice(0, 4)} hasta hoy` };
    case "last_month": {
      const month = shiftMonth(currentMonth, -1);
      return { from: `${month}-01`, to: monthEnd(month), label: displayPeriod(`${month}-01`, monthEnd(month)) };
    }
    case "last_30_days": {
      const from = shiftDays(today, -29);
      return { from, to: today, label: "los últimos 30 días" };
    }
    case "all_time":
      return { from: null, to: null, label: "todo el historial" };
    case "custom":
      return { from: filters.date_from, to: filters.date_to, label: displayPeriod(filters.date_from, filters.date_to) };
    case "current_month":
    default:
      return { from: `${currentMonth}-01`, to: today, label: "el mes corriente" };
  }
}

export function calculateTransactionTotals(rows: Pick<QueryRow, "type" | "amount_cents">[]) {
  const income = rows
    .filter((row) => row.type === "income")
    .reduce((total, row) => total + row.amount_cents, 0);
  const expenses = rows
    .filter((row) => row.type === "expense")
    .reduce((total, row) => total + row.amount_cents, 0);
  return { income, expenses, result: income - expenses };
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .trim();
}

function scopeLabel(scope: FinanceScope) {
  if (scope === "shared") return "el hogar";
  if (scope === "personal") return "tu espacio personal";
  return "el hogar y tu espacio personal";
}

async function fetchQueryRows(
  db: DbClient,
  householdId: string,
  userId: string,
  filters: QueryFilters,
  range: PeriodRange,
) {
  const scope = filters.scope ?? "combined";
  let query = db
    .from("transactions")
    .select("type,amount_cents,description,transaction_date,created_by,scope,categories(name),accounts(name)")
    .eq("household_id", householdId)
    .eq("status", "confirmed")
    .order("transaction_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(5_000);
  query = scope === "shared"
    ? query.eq("scope", "shared")
    : scope === "personal"
      ? query.eq("scope", "personal").eq("created_by", userId)
      : query.or(accessibleFinanceFilter(userId));
  if (range.from) query = query.gte("transaction_date", range.from);
  if (range.to) query = query.lte("transaction_date", range.to);
  if (filters.movement_type && filters.movement_type !== "both") {
    query = query.eq("type", filters.movement_type);
  }
  const [{ data, error }, { data: membersData, error: membersError }] = await Promise.all([
    query,
    db.from("household_members").select("user_id,profiles(display_name)").eq("household_id", householdId),
  ]);
  if (error || membersError) throw error ?? membersError;
  const members = (membersData ?? []) as unknown as {
    user_id: string;
    profiles: { display_name: string | null } | null;
  }[];
  const names = new Map(members.map((member) => [member.user_id, member.profiles?.display_name ?? "Miembro"]));
  let rows = (data ?? []) as unknown as QueryRow[];
  if (filters.category) {
    const category = normalize(filters.category);
    rows = rows.filter((row) => normalize(row.categories?.name ?? "").includes(category));
  }
  if (filters.account_name) {
    const account = normalize(filters.account_name);
    rows = rows.filter((row) => normalize(row.accounts?.name ?? "").includes(account));
  }
  if (filters.user_name) {
    const userName = normalize(filters.user_name);
    rows = rows.filter((row) => normalize(names.get(row.created_by) ?? "").includes(userName));
  }
  return { rows, names, scope };
}

function summaryReply(rows: QueryRow[], scope: FinanceScope, label: string) {
  const totals = calculateTransactionTotals(rows);
  if (scope === "combined") {
    const shared = calculateTransactionTotals(rows.filter((row) => row.scope === "shared"));
    const personal = calculateTransactionTotals(rows.filter((row) => row.scope === "personal"));
    return `Durante ${label}, en el hogar: ingresos ${formatMoney(shared.income)}, gastos ${formatMoney(shared.expenses)}, resultado ${formatMoney(shared.result)}. En tu espacio personal: ingresos ${formatMoney(personal.income)}, gastos ${formatMoney(personal.expenses)}, resultado ${formatMoney(personal.result)}. Resultado combinado: ${formatMoney(totals.result)}.`;
  }
  return `En ${scopeLabel(scope)}, durante ${label}: ${formatMoney(totals.income)} de ingresos y ${formatMoney(totals.expenses)} de gastos. El resultado es ${formatMoney(totals.result)}.`;
}

export async function executeFinanceQuery(
  db: DbClient,
  householdId: string,
  userId: string,
  data: FinanceQuery,
  now = new Date(),
) {
  const filters = data.filters;
  const today = madridToday(now);
  let range = resolveFinancePeriod(filters, now);
  if (data.query_type === "household_balance" || data.query_type === "recent_transactions") {
    range = { from: null, to: null, label: "todo el historial" };
  }
  if (data.query_type === "account_summary" && !filters.period && !filters.month && !filters.date_from && !filters.date_to) {
    range = { from: null, to: null, label: "todo el historial" };
  }
  if (data.query_type === "monthly_trend" && !filters.period && !filters.month && !filters.date_from && !filters.date_to) {
    range = resolveFinancePeriod({ ...filters, period: "current_year" }, now);
  }
  if (data.query_type === "compare_months") {
    const targetMonth = filters.month ?? today.slice(0, 7);
    const previousMonth = shiftMonth(targetMonth, -1);
    range = { from: `${previousMonth}-01`, to: targetMonth === today.slice(0, 7) ? today : monthEnd(targetMonth), label: "la comparación solicitada" };
  }
  const { rows, names, scope } = await fetchQueryRows(db, householdId, userId, filters, range);
  if (!rows.length) return `No hay movimientos confirmados en ${scopeLabel(scope)} para ${range.label}.`;

  if (data.query_type === "household_balance") {
    const totals = calculateTransactionTotals(rows);
    if (scope === "combined") {
      const shared = calculateTransactionTotals(rows.filter((row) => row.scope === "shared"));
      const personal = calculateTransactionTotals(rows.filter((row) => row.scope === "personal"));
      return `El saldo actual del hogar es ${formatMoney(shared.result)} y el de tu espacio personal es ${formatMoney(personal.result)}. El saldo combinado es ${formatMoney(totals.result)}. Todo está calculado con movimientos confirmados.`;
    }
    return `El saldo actual de ${scopeLabel(scope)} es ${formatMoney(totals.result)}: ${formatMoney(totals.income)} de ingresos menos ${formatMoney(totals.expenses)} de gastos registrados.`;
  }
  if (data.query_type === "recent_transactions") {
    return rows.slice(0, filters.limit ?? 5).map((row) =>
      `${row.scope === "shared" ? "Conjunto" : "Personal"} · ${row.accounts?.name ?? "Sin cuenta"} · ${row.type === "expense" ? "−" : "+"}${formatMoney(row.amount_cents)} · ${row.description} (${row.transaction_date})`,
    ).join("\n");
  }
  if (data.query_type === "category_spending") {
    const expenses = rows.filter((row) => row.type === "expense");
    const totals = new Map<string, number>();
    for (const row of expenses) {
      const category = row.categories?.name ?? "Sin categoría";
      totals.set(category, (totals.get(category) ?? 0) + row.amount_cents);
    }
    if (!totals.size) return `No hay gastos confirmados en ${scopeLabel(scope)} para ${range.label}.`;
    const detail = [...totals].sort((a, b) => b[1] - a[1]).map(([name, amount]) => `${name}: ${formatMoney(amount)}`).join("; ");
    return `Gastos por categoría en ${scopeLabel(scope)}, durante ${range.label}: ${detail}.`;
  }
  if (data.query_type === "user_contributions") {
    const totals = new Map<string, QueryRow[]>();
    for (const row of rows) totals.set(row.created_by, [...(totals.get(row.created_by) ?? []), row]);
    const detail = [...totals].map(([id, memberRows]) => {
      const values = calculateTransactionTotals(memberRows);
      return `${names.get(id) ?? "Miembro"}: ingresos ${formatMoney(values.income)}, gastos ${formatMoney(values.expenses)}`;
    }).join("; ");
    return `Detalle por persona durante ${range.label}: ${detail}.`;
  }
  if (data.query_type === "account_summary") {
    const totals = new Map<string, QueryRow[]>();
    for (const row of rows) {
      const account = row.accounts?.name ?? "Sin cuenta";
      totals.set(account, [...(totals.get(account) ?? []), row]);
    }
    const detail = [...totals].map(([account, accountRows]) => {
      const values = calculateTransactionTotals(accountRows);
      return `${account}: ingresos ${formatMoney(values.income)}, gastos ${formatMoney(values.expenses)}, saldo ${formatMoney(values.result)}`;
    }).join("; ");
    return `Actividad por cuenta durante ${range.label}: ${detail}.`;
  }
  if (data.query_type === "largest_transactions") {
    const movementType = filters.movement_type === "income" ? "income" : "expense";
    const selected = rows.filter((row) => row.type === movementType).sort((a, b) => b.amount_cents - a.amount_cents).slice(0, filters.limit ?? 5);
    if (!selected.length) return `No hay ${movementType === "expense" ? "gastos" : "ingresos"} confirmados para ${range.label}.`;
    return selected.map((row, index) => `${index + 1}. ${row.description}: ${formatMoney(row.amount_cents)} (${row.transaction_date})`).join("\n");
  }
  if (data.query_type === "monthly_trend") {
    const months = new Map<string, QueryRow[]>();
    for (const row of rows) {
      const month = row.transaction_date.slice(0, 7);
      months.set(month, [...(months.get(month) ?? []), row]);
    }
    const detail = [...months].sort(([a], [b]) => a.localeCompare(b)).map(([month, monthRows]) => {
      const values = calculateTransactionTotals(monthRows);
      return `${month}: ingresos ${formatMoney(values.income)}, gastos ${formatMoney(values.expenses)}, resultado ${formatMoney(values.result)}`;
    }).join("\n");
    return `Evolución mensual de ${scopeLabel(scope)}:\n${detail}`;
  }
  if (data.query_type === "compare_months") {
    const targetMonth = filters.month ?? today.slice(0, 7);
    const previousMonth = shiftMonth(targetMonth, -1);
    const currentTotals = calculateTransactionTotals(rows.filter((row) => row.transaction_date.startsWith(targetMonth)));
    const previousTotals = calculateTransactionTotals(rows.filter((row) => row.transaction_date.startsWith(previousMonth)));
    const expenseDifference = currentTotals.expenses - previousTotals.expenses;
    return `${targetMonth}: ingresos ${formatMoney(currentTotals.income)}, gastos ${formatMoney(currentTotals.expenses)}. ${previousMonth}: ingresos ${formatMoney(previousTotals.income)}, gastos ${formatMoney(previousTotals.expenses)}. La diferencia de gastos es ${expenseDifference >= 0 ? "+" : ""}${formatMoney(expenseDifference)}.`;
  }
  return summaryReply(rows, scope, range.label);
}

export async function getRecordedBalance(db: DbClient, householdId: string, userId: string, scope: FinanceScope = "combined") {
  return executeFinanceQuery(db, householdId, userId, {
    query_type: "household_balance",
    filters: { category: null, user_name: null, account_name: null, date_from: null, date_to: null, month: null, period: "all_time", movement_type: "both", limit: null, scope },
  });
}

export async function getMonthSummary(db: DbClient, householdId: string, userId: string, now = new Date(), scope: FinanceScope = "combined") {
  return executeFinanceQuery(db, householdId, userId, {
    query_type: "month_summary",
    filters: { category: null, user_name: null, account_name: null, date_from: null, date_to: null, month: null, period: "current_month", movement_type: "both", limit: null, scope },
  }, now);
}

export async function getRecentTransactions(db: DbClient, householdId: string, userId: string, limit = 5, scope: FinanceScope = "combined") {
  return executeFinanceQuery(db, householdId, userId, {
    query_type: "recent_transactions",
    filters: { category: null, user_name: null, account_name: null, date_from: null, date_to: null, month: null, period: "all_time", movement_type: "both", limit, scope },
  });
}
