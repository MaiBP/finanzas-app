import { formatMoney } from "@/lib/finance/money";

export type DailyMovementRow = {
  type: "expense" | "income";
  amount_cents: number;
  created_by: string | null;
};

export function buildDailySummaryMessage(rows: DailyMovementRow[], names: Map<string, string>): string | null {
  if (!rows.length) return null;

  const totals = new Map<string | null, { income: number; expenses: number }>();
  for (const row of rows) {
    const entry = totals.get(row.created_by) ?? { income: 0, expenses: 0 };
    if (row.type === "income") entry.income += row.amount_cents;
    else entry.expenses += row.amount_cents;
    totals.set(row.created_by, entry);
  }

  const totalExpenses = rows.filter((row) => row.type === "expense").reduce((sum, row) => sum + row.amount_cents, 0);
  const totalIncome = rows.filter((row) => row.type === "income").reduce((sum, row) => sum + row.amount_cents, 0);
  const headerParts: string[] = [];
  if (totalExpenses > 0) headerParts.push(`gastaron ${formatMoney(totalExpenses)}`);
  if (totalIncome > 0) headerParts.push(`ingresaron ${formatMoney(totalIncome)}`);
  const header = `📅 Hoy ${headerParts.join(" y ")} en total.`;

  const lines = [...totals.entries()].map(([userId, values]) => {
    const name = userId === null ? "Miembro eliminado" : (names.get(userId) ?? "Alguien");
    const parts: string[] = [];
    if (values.expenses > 0) parts.push(`gastó ${formatMoney(values.expenses)}`);
    if (values.income > 0) parts.push(`le ingresaron ${formatMoney(values.income)}`);
    return `• ${name}: ${parts.join(" y ")}`;
  });

  return `${header}\n${lines.join("\n")}`;
}

export const WEEKLY_REMINDER_MESSAGE = "👋 ¿Gastaste o te ingresaron algo hoy? No te olvides de registrarlo en Miti-Miti.";

function hashString(value: string): number {
  let hash = 5381;
  for (let i = 0; i < value.length; i++) hash = ((hash * 33) ^ value.charCodeAt(i)) >>> 0;
  return hash >>> 0;
}

function parseIsoDate(dateISO: string): Date {
  const [year, month, day] = dateISO.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function weekdayIndex(dateISO: string): number {
  return (parseIsoDate(dateISO).getUTCDay() + 6) % 7; // Monday=0 .. Sunday=6
}

function isoWeekKey(dateISO: string): string {
  const date = parseIsoDate(dateISO);
  const dayNumber = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dayNumber + 3); // nearest Thursday
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const firstDayNumber = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNumber + 3);
  const weekNumber = 1 + Math.round((date.getTime() - firstThursday.getTime()) / (7 * 24 * 3600 * 1000));
  return `${date.getUTCFullYear()}-W${String(weekNumber).padStart(2, "0")}`;
}

/** Deterministic per (household, ISO week) pick of exactly 3 distinct weekdays (0=Mon..6=Sun). */
export function reminderDaysForWeek(householdId: string, dateISO: string): Set<number> {
  const seed = hashString(`${householdId}:${isoWeekKey(dateISO)}`);
  const days = [0, 1, 2, 3, 4, 5, 6];
  let state = seed || 1;
  const nextRandom = () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
  for (let i = days.length - 1; i > 0; i--) {
    const j = Math.floor(nextRandom() * (i + 1));
    [days[i], days[j]] = [days[j], days[i]];
  }
  return new Set(days.slice(0, 3));
}

export function isReminderDay(householdId: string, dateISO: string): boolean {
  return reminderDaysForWeek(householdId, dateISO).has(weekdayIndex(dateISO));
}
