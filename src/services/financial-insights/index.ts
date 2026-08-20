import type { SupabaseClient } from "@supabase/supabase-js";
import { formatMoney } from "@/lib/finance/money";
import { decryptField } from "@/lib/security/field-encryption";

export type InsightTransaction = {
  type: "expense" | "income";
  amount_cents: number;
  description: string;
  transaction_date: string;
  categories: { name: string } | null;
};

export type FinancialInsight = {
  key: string;
  label: "Recordatorio" | "Tendencia" | "Ahorro" | "Consejo";
  message: string;
  detail: string;
  notifiable: boolean;
};

const recurringExpensePattern = /\b(alquiler|renta|hipoteca|electricidad|luz|agua|gas|internet|tel[eé]fono|seguro|cuota|suscripci[oó]n)\b/i;

function monthAtOffset(month: string, offset: number) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(Date.UTC(year, monthNumber - 1 + offset, 1)).toISOString().slice(0, 7);
}

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es").replace(/[^a-z0-9]+/g, " ").trim();
}

function lowerFirst(value: string) {
  const cleaned = value.replace(/^(?:pago|recibo)(?:\s+de)?\s+/i, "").trim();
  return cleaned ? cleaned.charAt(0).toLocaleLowerCase("es") + cleaned.slice(1) : value;
}

export function analyzeFinancialBehavior(transactions: InsightTransaction[], month: string, today: string, scope: "shared" | "personal" = "shared"): FinancialInsight {
  const todayMonth = today.slice(0, 7);
  const currentRows = transactions.filter(transaction => transaction.transaction_date.slice(0, 7) === month);
  const currentExpenses = currentRows.filter(transaction => transaction.type === "expense").reduce((total, transaction) => total + transaction.amount_cents, 0);
  const currentIncome = currentRows.filter(transaction => transaction.type === "income").reduce((total, transaction) => total + transaction.amount_cents, 0);

  if (month === todayMonth) {
    const previousMonth = monthAtOffset(month, -1);
    const twoMonthsAgo = monthAtOffset(month, -2);
    const recurringGroups = new Map<string, InsightTransaction[]>();
    for (const transaction of transactions.filter(row => row.type === "expense" && recurringExpensePattern.test(`${row.description} ${row.categories?.name ?? ""}`))) {
      const key = normalize(transaction.description);
      recurringGroups.set(key, [...(recurringGroups.get(key) ?? []), transaction]);
    }
    const recurring = [...recurringGroups.entries()].map(([key, rows]) => ({
      key,
      rows,
      previous: rows.filter(row => row.transaction_date.startsWith(previousMonth)),
      older: rows.filter(row => row.transaction_date.startsWith(twoMonthsAgo)),
      current: rows.filter(row => row.transaction_date.startsWith(month)),
    })).filter(group => group.previous.length && group.older.length && !group.current.length).map(group => {
      const samples = [...group.previous, ...group.older];
      const expectedDay = Math.round(samples.reduce((total, row) => total + Number(row.transaction_date.slice(8, 10)), 0) / samples.length);
      return { ...group, expectedDay, description: group.previous[0]?.description ?? group.older[0].description };
    }).filter(group => Number(today.slice(8, 10)) >= Math.max(1, group.expectedDay - 3)).sort((a, b) => a.expectedDay - b.expectedDay)[0];

    if (recurring) return {
      key: `${month}:recurring:${recurring.key}`,
      label: "Recordatorio",
      message: scope === "personal" ? `¡No te olvides de pagar ${lowerFirst(recurring.description)}!` : `¡No os olvidéis de pagar ${lowerFirst(recurring.description)}!`,
      detail: `Suele registrarse cerca del día ${recurring.expectedDay}.`,
      notifiable: true,
    };
  }

  const categoryTotals = new Map<string, { name: string; values: Map<string, number> }>();
  for (const transaction of transactions.filter(row => row.type === "expense")) {
    const name = transaction.categories?.name ?? "Otros";
    const key = normalize(name);
    const group = categoryTotals.get(key) ?? { name, values: new Map<string, number>() };
    const transactionMonth = transaction.transaction_date.slice(0, 7);
    group.values.set(transactionMonth, (group.values.get(transactionMonth) ?? 0) + transaction.amount_cents);
    categoryTotals.set(key, group);
  }
  const previousMonth = monthAtOffset(month, -1);
  const twoMonthsAgo = monthAtOffset(month, -2);
  const risingCategory = [...categoryTotals.entries()].map(([key, group]) => ({
    key,
    name: group.name,
    current: group.values.get(month) ?? 0,
    previous: group.values.get(previousMonth) ?? 0,
    older: group.values.get(twoMonthsAgo) ?? 0,
  })).filter(group => group.older > 0 && group.previous > group.older && group.current > group.previous && group.current >= group.older * 1.1).sort((a, b) => (b.current / b.older) - (a.current / a.older))[0];

  if (risingCategory) return {
    key: `${month}:category-rise:${risingCategory.key}`,
    label: "Tendencia",
    message: `Hace tres meses que aumenta el gasto en ${risingCategory.name.toLocaleLowerCase("es")}.`,
    detail: `Este mes: ${formatMoney(risingCategory.current)} · anterior: ${formatMoney(risingCategory.previous)}.`,
    notifiable: month === todayMonth,
  };

  if (currentIncome > 0) {
    const savings = currentIncome - currentExpenses;
    const savingsRate = Math.round((savings / currentIncome) * 100);
    return savings >= 0 ? {
      key: `${month}:savings:positive`,
      label: "Ahorro",
      message: scope === "personal" ? `Este mes ahorraste un ${savingsRate} %.` : `Este mes ahorraron un ${savingsRate} %.`,
      detail: `Ahorro actual: ${formatMoney(savings)}.`,
      notifiable: month === todayMonth && Number(today.slice(8, 10)) >= 7,
    } : {
      key: `${month}:savings:negative`,
      label: "Consejo",
      message: `Este mes los gastos superan los ingresos en un ${Math.abs(savingsRate)} %.`,
      detail: `Diferencia actual: ${formatMoney(Math.abs(savings))}.`,
      notifiable: month === todayMonth && Number(today.slice(8, 10)) >= 7,
    };
  }

  return {
    key: `${month}:insufficient-data`,
    label: "Recordatorio",
    message: "Todavía no hay suficientes datos para detectar patrones.",
    detail: scope === "personal" ? "Sigue registrando movimientos y aquí aparecerán recomendaciones." : "Seguid registrando movimientos y aquí aparecerán recomendaciones.",
    notifiable: false,
  };
}

export async function getHouseholdFinancialInsight(db: SupabaseClient, householdId: string, month: string, today = new Date().toISOString().slice(0, 10)) {
  const historyStart = `${monthAtOffset(month, -3)}-01`;
  const historyEnd = `${monthAtOffset(month, 1)}-01`;
  const { data, error } = await db.from("transactions").select("type,amount_cents,description,transaction_date,categories(name)").eq("household_id", householdId).eq("scope", "shared").eq("status", "confirmed").gte("transaction_date", historyStart).lt("transaction_date", historyEnd);
  if (error) throw error;
  const transactions = ((data ?? []) as unknown as InsightTransaction[]).map((row) => ({ ...row, description: decryptField(row.description) }));
  return analyzeFinancialBehavior(transactions, month, today, "shared");
}

export async function getPersonalFinancialInsight(db: SupabaseClient, userId: string, householdId: string, month: string, today = new Date().toISOString().slice(0, 10)) {
  const historyStart = `${monthAtOffset(month, -3)}-01`;
  const historyEnd = `${monthAtOffset(month, 1)}-01`;
  const { data, error } = await db.from("transactions").select("type,amount_cents,description,transaction_date,categories(name)").eq("household_id", householdId).eq("created_by", userId).eq("scope", "personal").eq("status", "confirmed").gte("transaction_date", historyStart).lt("transaction_date", historyEnd);
  if (error) throw error;
  const transactions = ((data ?? []) as unknown as InsightTransaction[]).map((row) => ({ ...row, description: decryptField(row.description) }));
  return analyzeFinancialBehavior(transactions, month, today, "personal");
}
