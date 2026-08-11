import { describe, expect, it } from "vitest";
import { formatMoney } from "@/lib/finance/money";
import {
  computeFinanceQueryFacts,
  executeFinanceQuery,
  formatFactsForPrompt,
  formatFinanceReply,
  type FinanceQuery,
} from "@/services/query-service";

type Row = {
  type: "expense" | "income";
  amount_cents: number;
  description: string;
  transaction_date: string;
  created_by: string;
  scope: "shared" | "personal";
  categories: { name: string } | null;
  accounts: { name: string } | null;
};

function chainable(result: { data: unknown; error: null }) {
  const proxy: unknown = new Proxy(() => undefined, {
    get(_target, prop) {
      if (prop === "then") return (resolve: (value: unknown) => void) => resolve(result);
      return () => proxy;
    },
  });
  return proxy;
}

function createDb(rows: Row[], members: { user_id: string; profiles: { display_name: string } }[]) {
  return {
    from(table: string) {
      if (table === "transactions") return chainable({ data: rows, error: null });
      if (table === "household_members") return chainable({ data: members, error: null });
      throw new Error(`unexpected table ${table}`);
    },
  } as Parameters<typeof computeFinanceQueryFacts>[0];
}

const rows: Row[] = [
  { type: "income", amount_cents: 100_000, description: "Sueldo", transaction_date: "2026-08-01", created_by: "user-1", scope: "shared", categories: { name: "Salario" }, accounts: { name: "Banco" } },
  { type: "expense", amount_cents: 30_000, description: "Super", transaction_date: "2026-08-02", created_by: "user-1", scope: "shared", categories: { name: "Supermercado" }, accounts: { name: "Banco" } },
  { type: "expense", amount_cents: 5_000, description: "Café", transaction_date: "2026-08-03", created_by: "user-2", scope: "shared", categories: { name: "Ocio" }, accounts: { name: "Efectivo" } },
];
const members = [
  { user_id: "user-1", profiles: { display_name: "Maira" } },
  { user_id: "user-2", profiles: { display_name: "Pablo" } },
];

const baseFilters: FinanceQuery["filters"] = {
  category: null,
  user_name: null,
  account_name: null,
  date_from: null,
  date_to: null,
  month: null,
  period: "all_time",
  movement_type: "both",
  limit: null,
  scope: "shared",
};

describe("computeFinanceQueryFacts", () => {
  it("computes household balance totals", async () => {
    const db = createDb(rows, members);
    const facts = await computeFinanceQueryFacts(db, "household-1", "user-1", {
      query_type: "household_balance",
      filters: baseFilters,
    });
    expect(facts).toEqual({
      kind: "household_balance",
      scope: "shared",
      totals: { income: 100_000, expenses: 35_000, result: 65_000 },
    });
  });

  it("groups expenses by category, sorted descending", async () => {
    const db = createDb(rows, members);
    const facts = await computeFinanceQueryFacts(db, "household-1", "user-1", {
      query_type: "category_spending",
      filters: baseFilters,
    });
    expect(facts.kind).toBe("category_spending");
    if (facts.kind !== "category_spending" || facts.empty) throw new Error("expected populated category_spending facts");
    expect(facts.categories).toEqual([
      { name: "Supermercado", amount_cents: 30_000 },
      { name: "Ocio", amount_cents: 5_000 },
    ]);
  });

  it("returns no_data facts when there are no rows", async () => {
    const db = createDb([], members);
    const facts = await computeFinanceQueryFacts(db, "household-1", "user-1", {
      query_type: "household_balance",
      filters: baseFilters,
    });
    expect(facts.kind).toBe("no_data");
  });
});

describe("formatFinanceReply", () => {
  it("formats household balance facts deterministically", () => {
    const reply = formatFinanceReply({
      kind: "household_balance",
      scope: "shared",
      totals: { income: 100_000, expenses: 35_000, result: 65_000 },
    });
    expect(reply).toBe(
      `El saldo actual de el hogar es ${formatMoney(65_000)}: ${formatMoney(100_000)} de ingresos menos ${formatMoney(35_000)} de gastos registrados.`,
    );
  });
});

describe("executeFinanceQuery fallback", () => {
  it("falls back to the deterministic template when no OpenAI key is configured", async () => {
    const original = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    try {
      const db = createDb(rows, members);
      const facts = await computeFinanceQueryFacts(db, "household-1", "user-1", {
        query_type: "household_balance",
        filters: baseFilters,
      });
      const reply = await executeFinanceQuery(
        db,
        "household-1",
        "user-1",
        { query_type: "household_balance", filters: baseFilters },
        new Date(),
        { question: "¿cuál es nuestro saldo?" },
      );
      expect(reply).toBe(formatFinanceReply(facts));
    } finally {
      if (original) process.env.OPENAI_API_KEY = original;
    }
  });

  it("skips the AI phrasing pass entirely when no conversational context is given", async () => {
    const db = createDb(rows, members);
    const facts = await computeFinanceQueryFacts(db, "household-1", "user-1", {
      query_type: "household_balance",
      filters: baseFilters,
    });
    const reply = await executeFinanceQuery(db, "household-1", "user-1", {
      query_type: "household_balance",
      filters: baseFilters,
    });
    expect(reply).toBe(formatFinanceReply(facts));
  });
});

describe("formatFactsForPrompt", () => {
  it("converts every cent amount into a formatted euro string so the AI never sees raw numbers", () => {
    const formatted = formatFactsForPrompt({
      kind: "household_balance",
      scope: "shared",
      totals: { income: 2_043_314, expenses: 1_000_000, result: 1_043_314 },
    });
    expect(formatted).toEqual({
      kind: "household_balance",
      scope: "shared",
      totals: { income: formatMoney(2_043_314), expenses: formatMoney(1_000_000), result: formatMoney(1_043_314) },
    });
  });

  it("formats amounts nested inside arrays", () => {
    const formatted = formatFactsForPrompt({
      kind: "recent_transactions",
      items: [{ scope: "shared", account: "Banco", type: "expense", amount_cents: 4250, description: "Super", date: "2026-08-01" }],
    }) as { items: { amount_cents: string }[] };
    expect(formatted.items[0].amount_cents).toBe(formatMoney(4250));
  });
});
