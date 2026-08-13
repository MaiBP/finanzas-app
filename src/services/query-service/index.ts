import { formatMoney } from "@/lib/finance/money";
import type { FinancialAction } from "@/services/financial-message-parser/schema";
import type { ConversationMessage } from "@/services/conversation-history";
import { phraseFinanceReply } from "@/services/finance-reply";

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
type Totals = { income: number; expenses: number; result: number };

export type FinanceQueryFacts =
  | { kind: "no_data"; scope: FinanceScope; rangeLabel: string }
  | { kind: "household_balance"; scope: FinanceScope; totals: Totals; shared?: Totals; personal?: Totals }
  | {
      kind: "recent_transactions";
      items: { scope: "shared" | "personal"; account: string; type: "expense" | "income"; amount_cents: number; description: string; date: string }[];
    }
  | { kind: "category_spending"; scope: FinanceScope; rangeLabel: string; empty: true }
  | { kind: "category_spending"; scope: FinanceScope; rangeLabel: string; empty?: false; categories: { name: string; amount_cents: number }[] }
  | { kind: "user_contributions"; rangeLabel: string; members: { name: string; income: number; expenses: number }[] }
  | { kind: "account_summary"; rangeLabel: string; accounts: { name: string; income: number; expenses: number; result: number }[] }
  | { kind: "largest_transactions"; movementType: "expense" | "income"; rangeLabel: string; empty: true }
  | { kind: "largest_transactions"; movementType: "expense" | "income"; rangeLabel: string; empty?: false; items: { description: string; amount_cents: number; date: string }[] }
  | { kind: "monthly_trend"; scope: FinanceScope; months: { month: string; income: number; expenses: number; result: number }[] }
  | { kind: "compare_months"; targetMonth: string; previousMonth: string; current: Totals; previous: Totals; expenseDifference: number }
  | { kind: "summary"; scope: FinanceScope; rangeLabel: string; movementType: "both"; totals: Totals; shared?: Totals; personal?: Totals }
  | { kind: "summary"; scope: FinanceScope; rangeLabel: string; movementType: "expense" | "income"; amount: number; sharedAmount?: number; personalAmount?: number };

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

export function calculateTransactionTotals(rows: Pick<QueryRow, "type" | "amount_cents">[]): Totals {
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

function summaryFacts(
  rows: QueryRow[],
  scope: FinanceScope,
  rangeLabel: string,
  movementType: "expense" | "income" | "both",
): FinanceQueryFacts {
  if (movementType !== "both") {
    const amountFor = (scopedRows: QueryRow[]) =>
      scopedRows.filter((row) => row.type === movementType).reduce((sum, row) => sum + row.amount_cents, 0);
    if (scope === "combined") {
      return {
        kind: "summary",
        scope,
        rangeLabel,
        movementType,
        amount: amountFor(rows),
        sharedAmount: amountFor(rows.filter((row) => row.scope === "shared")),
        personalAmount: amountFor(rows.filter((row) => row.scope === "personal")),
      };
    }
    return { kind: "summary", scope, rangeLabel, movementType, amount: amountFor(rows) };
  }
  const totals = calculateTransactionTotals(rows);
  if (scope === "combined") {
    return {
      kind: "summary",
      scope,
      rangeLabel,
      movementType: "both",
      totals,
      shared: calculateTransactionTotals(rows.filter((row) => row.scope === "shared")),
      personal: calculateTransactionTotals(rows.filter((row) => row.scope === "personal")),
    };
  }
  return { kind: "summary", scope, rangeLabel, movementType: "both", totals };
}

export async function computeFinanceQueryFacts(
  db: DbClient,
  householdId: string,
  userId: string,
  data: FinanceQuery,
  now = new Date(),
): Promise<FinanceQueryFacts> {
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
  if (!rows.length) return { kind: "no_data", scope, rangeLabel: range.label };

  if (data.query_type === "household_balance") {
    const totals = calculateTransactionTotals(rows);
    if (scope === "combined") {
      return {
        kind: "household_balance",
        scope,
        totals,
        shared: calculateTransactionTotals(rows.filter((row) => row.scope === "shared")),
        personal: calculateTransactionTotals(rows.filter((row) => row.scope === "personal")),
      };
    }
    return { kind: "household_balance", scope, totals };
  }
  if (data.query_type === "recent_transactions") {
    const items = rows.slice(0, filters.limit ?? 5).map((row) => ({
      scope: row.scope,
      account: row.accounts?.name ?? "Sin cuenta",
      type: row.type,
      amount_cents: row.amount_cents,
      description: row.description,
      date: row.transaction_date,
    }));
    return { kind: "recent_transactions", items };
  }
  if (data.query_type === "category_spending") {
    const expenses = rows.filter((row) => row.type === "expense");
    const totals = new Map<string, number>();
    for (const row of expenses) {
      const category = row.categories?.name ?? "Sin categoría";
      totals.set(category, (totals.get(category) ?? 0) + row.amount_cents);
    }
    if (!totals.size) return { kind: "category_spending", scope, rangeLabel: range.label, empty: true };
    const categories = [...totals].sort((a, b) => b[1] - a[1]).map(([name, amount_cents]) => ({ name, amount_cents }));
    return { kind: "category_spending", scope, rangeLabel: range.label, categories };
  }
  if (data.query_type === "user_contributions") {
    const totals = new Map<string, QueryRow[]>();
    for (const row of rows) totals.set(row.created_by, [...(totals.get(row.created_by) ?? []), row]);
    const members = [...totals].map(([id, memberRows]) => {
      const values = calculateTransactionTotals(memberRows);
      return { name: names.get(id) ?? "Miembro", income: values.income, expenses: values.expenses };
    });
    return { kind: "user_contributions", rangeLabel: range.label, members };
  }
  if (data.query_type === "account_summary") {
    const totals = new Map<string, QueryRow[]>();
    for (const row of rows) {
      const account = row.accounts?.name ?? "Sin cuenta";
      totals.set(account, [...(totals.get(account) ?? []), row]);
    }
    const accounts = [...totals].map(([name, accountRows]) => {
      const values = calculateTransactionTotals(accountRows);
      return { name, income: values.income, expenses: values.expenses, result: values.result };
    });
    return { kind: "account_summary", rangeLabel: range.label, accounts };
  }
  if (data.query_type === "largest_transactions") {
    const movementType = filters.movement_type === "income" ? "income" : "expense";
    const selected = rows.filter((row) => row.type === movementType).sort((a, b) => b.amount_cents - a.amount_cents).slice(0, filters.limit ?? 5);
    if (!selected.length) return { kind: "largest_transactions", movementType, rangeLabel: range.label, empty: true };
    const items = selected.map((row) => ({ description: row.description, amount_cents: row.amount_cents, date: row.transaction_date }));
    return { kind: "largest_transactions", movementType, rangeLabel: range.label, items };
  }
  if (data.query_type === "monthly_trend") {
    const monthsMap = new Map<string, QueryRow[]>();
    for (const row of rows) {
      const month = row.transaction_date.slice(0, 7);
      monthsMap.set(month, [...(monthsMap.get(month) ?? []), row]);
    }
    const months = [...monthsMap].sort(([a], [b]) => a.localeCompare(b)).map(([month, monthRows]) => {
      const values = calculateTransactionTotals(monthRows);
      return { month, income: values.income, expenses: values.expenses, result: values.result };
    });
    return { kind: "monthly_trend", scope, months };
  }
  if (data.query_type === "compare_months") {
    const targetMonth = filters.month ?? today.slice(0, 7);
    const previousMonth = shiftMonth(targetMonth, -1);
    const current = calculateTransactionTotals(rows.filter((row) => row.transaction_date.startsWith(targetMonth)));
    const previous = calculateTransactionTotals(rows.filter((row) => row.transaction_date.startsWith(previousMonth)));
    return { kind: "compare_months", targetMonth, previousMonth, current, previous, expenseDifference: current.expenses - previous.expenses };
  }
  return summaryFacts(rows, scope, range.label, filters.movement_type ?? "both");
}

const MEDALS = ["🥇", "🥈", "🥉"];

export function formatFinanceReply(facts: FinanceQueryFacts): string {
  switch (facts.kind) {
    case "no_data":
      return `🤷 No hay movimientos confirmados en ${scopeLabel(facts.scope)} para ${facts.rangeLabel}.`;
    case "household_balance":
      if (facts.scope === "combined" && facts.shared && facts.personal) {
        return `🏠 El saldo actual del hogar es ${formatMoney(facts.shared.result)} y el de tu espacio personal es ${formatMoney(facts.personal.result)}. 📊 El saldo combinado es ${formatMoney(facts.totals.result)}. Todo está calculado con movimientos confirmados.`;
      }
      return `💰 El saldo actual de ${scopeLabel(facts.scope)} es ${formatMoney(facts.totals.result)}: ${formatMoney(facts.totals.income)} de ingresos menos ${formatMoney(facts.totals.expenses)} de gastos registrados.`;
    case "recent_transactions":
      return facts.items.map((item) =>
        `${item.type === "expense" ? "🔴" : "🟢"} ${item.scope === "shared" ? "Conjunto" : "Personal"} · ${item.account} · ${item.type === "expense" ? "−" : "+"}${formatMoney(item.amount_cents)} · ${item.description} (${item.date})`,
      ).join("\n");
    case "category_spending":
      if (facts.empty) return `🤷 No hay gastos confirmados en ${scopeLabel(facts.scope)} para ${facts.rangeLabel}.`;
      return `🏷️ Gastos por categoría en ${scopeLabel(facts.scope)}, durante ${facts.rangeLabel}: ${facts.categories.map((c) => `${c.name}: ${formatMoney(c.amount_cents)}`).join("; ")}.`;
    case "user_contributions":
      return `👥 Detalle por persona durante ${facts.rangeLabel}: ${facts.members.map((m) => `${m.name}: ingresos ${formatMoney(m.income)}, gastos ${formatMoney(m.expenses)}`).join("; ")}.`;
    case "account_summary":
      return `🏦 Actividad por cuenta durante ${facts.rangeLabel}: ${facts.accounts.map((a) => `${a.name}: ingresos ${formatMoney(a.income)}, gastos ${formatMoney(a.expenses)}, saldo ${formatMoney(a.result)}`).join("; ")}.`;
    case "largest_transactions":
      if (facts.empty) return `🤷 No hay ${facts.movementType === "expense" ? "gastos" : "ingresos"} confirmados para ${facts.rangeLabel}.`;
      return `🏆 ${facts.items.map((item, index) => `${MEDALS[index] ?? `${index + 1}.`} ${item.description}: ${formatMoney(item.amount_cents)} (${item.date})`).join("\n")}`;
    case "monthly_trend":
      return `📈 Evolución mensual de ${scopeLabel(facts.scope)}:\n${facts.months.map((m) => `${m.month}: ingresos ${formatMoney(m.income)}, gastos ${formatMoney(m.expenses)}, resultado ${formatMoney(m.result)}`).join("\n")}`;
    case "compare_months": {
      const trend = facts.expenseDifference >= 0 ? "🔺" : "🔻";
      return `📊 ${facts.targetMonth}: ingresos ${formatMoney(facts.current.income)}, gastos ${formatMoney(facts.current.expenses)}. ${facts.previousMonth}: ingresos ${formatMoney(facts.previous.income)}, gastos ${formatMoney(facts.previous.expenses)}. ${trend} La diferencia de gastos es ${facts.expenseDifference >= 0 ? "+" : ""}${formatMoney(facts.expenseDifference)}.`;
    }
    case "summary": {
      if (facts.movementType !== "both") {
        const emoji = facts.movementType === "expense" ? "💸" : "💰";
        const noun = facts.movementType === "expense" ? "de gastos" : "de ingresos";
        if (facts.scope === "combined" && facts.sharedAmount !== undefined && facts.personalAmount !== undefined) {
          return `${emoji} Durante ${facts.rangeLabel}, en el hogar: ${formatMoney(facts.sharedAmount)} ${noun}. En tu espacio personal: ${formatMoney(facts.personalAmount)} ${noun}. Total combinado: ${formatMoney(facts.amount)} ${noun}.`;
        }
        return `${emoji} En ${scopeLabel(facts.scope)}, durante ${facts.rangeLabel}: ${formatMoney(facts.amount)} ${noun}.`;
      }
      if (facts.scope === "combined" && facts.shared && facts.personal) {
        return `📊 Durante ${facts.rangeLabel}, en el hogar: ingresos ${formatMoney(facts.shared.income)}, gastos ${formatMoney(facts.shared.expenses)}, resultado ${formatMoney(facts.shared.result)}. En tu espacio personal: ingresos ${formatMoney(facts.personal.income)}, gastos ${formatMoney(facts.personal.expenses)}, resultado ${formatMoney(facts.personal.result)}. Resultado combinado: ${formatMoney(facts.totals.result)}.`;
      }
      return `📊 En ${scopeLabel(facts.scope)}, durante ${facts.rangeLabel}: 💰 ${formatMoney(facts.totals.income)} de ingresos y 💸 ${formatMoney(facts.totals.expenses)} de gastos. El resultado es ${formatMoney(facts.totals.result)}.`;
    }
  }
}

// Every numeric field in FinanceQueryFacts is an amount in cents. The phrasing model has no
// notion of "cents" vs "euros", so it must never see raw numbers — only pre-formatted euro
// strings — or it reads e.g. 2043314 as "2.043.314" instead of 20.433,14 €.
export function formatFactsForPrompt(value: unknown): unknown {
  if (typeof value === "number") return formatMoney(value);
  if (Array.isArray(value)) return value.map(formatFactsForPrompt);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, val]) => [key, formatFactsForPrompt(val)]));
  }
  return value;
}

export async function executeFinanceQuery(
  db: DbClient,
  householdId: string,
  userId: string,
  data: FinanceQuery,
  now = new Date(),
  context?: { question: string; recentMessages?: ConversationMessage[] },
): Promise<string> {
  const facts = await computeFinanceQueryFacts(db, householdId, userId, data, now);
  if (!context) return formatFinanceReply(facts);
  try {
    return await phraseFinanceReply(formatFactsForPrompt(facts), context.question, context.recentMessages ?? []);
  } catch (error) {
    console.error("phraseFinanceReply failed, falling back to template", error);
    return formatFinanceReply(facts);
  }
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
