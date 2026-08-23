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
  created_by: string | null;
  scope: "shared" | "personal";
  account_id: string;
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
      // Every account referenced by the fixture rows is "active" — household_balance/account_summary
      // now exclude archived accounts by default, and these tests aren't exercising that filter.
      if (table === "accounts") return chainable({ data: [{ id: "acc-banco" }, { id: "acc-efectivo" }], error: null });
      throw new Error(`unexpected table ${table}`);
    },
  } as Parameters<typeof computeFinanceQueryFacts>[0];
}

const rows: Row[] = [
  { type: "income", amount_cents: 100_000, description: "Sueldo", transaction_date: "2026-08-01", created_by: "user-1", scope: "shared", account_id: "acc-banco", categories: { name: "Salario" }, accounts: { name: "Banco" } },
  { type: "expense", amount_cents: 30_000, description: "Super", transaction_date: "2026-08-02", created_by: "user-1", scope: "shared", account_id: "acc-banco", categories: { name: "Supermercado" }, accounts: { name: "Banco" } },
  { type: "expense", amount_cents: 5_000, description: "Café", transaction_date: "2026-08-03", created_by: "user-2", scope: "shared", account_id: "acc-efectivo", categories: { name: "Ocio" }, accounts: { name: "Efectivo" } },
];
const members = [
  { user_id: "user-1", profiles: { display_name: "Maira" } },
  { user_id: "user-2", profiles: { display_name: "Pablo" } },
];

const baseFilters: FinanceQuery["filters"] = {
  category: null,
  subcategory: null,
  user_name: null,
  account_name: null,
  search_text: null,
  ratio_category_a: null,
  ratio_category_b: null,
  date_from: null,
  date_to: null,
  month: null,
  period: "all_time",
  movement_type: "both",
  limit: null,
  scope: "shared",
  include_deleted_accounts: false,
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

  it("excludes a since-archived account's transactions from the current balance by default", async () => {
    const rowsWithArchived: Row[] = [...rows, { type: "income", amount_cents: 20_000, description: "Cuenta vieja", transaction_date: "2026-08-01", created_by: "user-1", scope: "shared", account_id: "acc-archivada", categories: { name: "Salario" }, accounts: { name: "Cuenta vieja" } }];
    const db = createDb(rowsWithArchived, members);
    const facts = await computeFinanceQueryFacts(db, "household-1", "user-1", { query_type: "household_balance", filters: baseFilters });
    expect(facts).toEqual({ kind: "household_balance", scope: "shared", totals: { income: 100_000, expenses: 35_000, result: 65_000 } });
  });

  it("includes a since-archived account's transactions when the user explicitly asks for historical/deleted-account data", async () => {
    const rowsWithArchived: Row[] = [...rows, { type: "income", amount_cents: 20_000, description: "Cuenta vieja", transaction_date: "2026-08-01", created_by: "user-1", scope: "shared", account_id: "acc-archivada", categories: { name: "Salario" }, accounts: { name: "Cuenta vieja" } }];
    const db = createDb(rowsWithArchived, members);
    const facts = await computeFinanceQueryFacts(db, "household-1", "user-1", { query_type: "household_balance", filters: { ...baseFilters, include_deleted_accounts: true } });
    expect(facts).toEqual({ kind: "household_balance", scope: "shared", totals: { income: 120_000, expenses: 35_000, result: 85_000 } });
  });

  it("excludes a since-archived account from the per-account breakdown by default", async () => {
    const rowsWithArchived: Row[] = [...rows, { type: "income", amount_cents: 20_000, description: "Cuenta vieja", transaction_date: "2026-08-01", created_by: "user-1", scope: "shared", account_id: "acc-archivada", categories: { name: "Salario" }, accounts: { name: "Cuenta vieja" } }];
    const db = createDb(rowsWithArchived, members);
    const facts = await computeFinanceQueryFacts(db, "household-1", "user-1", { query_type: "account_summary", filters: baseFilters });
    if (facts.kind !== "account_summary") throw new Error("expected account_summary facts");
    expect(facts.accounts.map((account) => account.name)).not.toContain("Cuenta vieja");
  });

  it("groups item amounts by subcategory, sorted descending", async () => {
    const itemizedRows: Row[] = [
      { type: "expense", amount_cents: 8400, description: "Mercadona", transaction_date: "2026-08-02", created_by: "user-1", scope: "shared", account_id: "acc-banco", categories: { name: "Supermercado" }, accounts: { name: "Banco" } },
    ];
    const items = [
      { transaction_id: "t1", amount_cents: 2000, subcategory: "Snacks y dulces" },
      { transaction_id: "t1", amount_cents: 1500, subcategory: "Bebidas" },
      { transaction_id: "t1", amount_cents: 800, subcategory: "Limpieza" },
    ];
    const rowsWithId = itemizedRows.map((row) => ({ ...row, id: "t1" }));
    const db = {
      from(table: string) {
        if (table === "transactions") return chainable({ data: rowsWithId, error: null });
        if (table === "household_members") return chainable({ data: members, error: null });
        if (table === "transaction_items") return chainable({ data: items, error: null });
        if (table === "accounts") return chainable({ data: [{ id: "acc-banco" }], error: null });
        throw new Error(`unexpected table ${table}`);
      },
    } as Parameters<typeof computeFinanceQueryFacts>[0];
    const facts = await computeFinanceQueryFacts(db, "household-1", "user-1", {
      query_type: "item_spending",
      filters: baseFilters,
    });
    expect(facts.kind).toBe("item_spending");
    if (facts.kind !== "item_spending" || facts.empty) throw new Error("expected populated item_spending facts");
    expect(facts.items).toEqual([
      { subcategory: "Snacks y dulces", amount_cents: 2000 },
      { subcategory: "Bebidas", amount_cents: 1500 },
      { subcategory: "Limpieza", amount_cents: 800 },
    ]);
  });

  it("filters item_spending by subcategory", async () => {
    const rowsWithId = [{ type: "expense", amount_cents: 8400, description: "Mercadona", transaction_date: "2026-08-02", created_by: "user-1", scope: "shared", account_id: "acc-banco", categories: { name: "Supermercado" }, accounts: { name: "Banco" }, id: "t1" }];
    const items = [
      { transaction_id: "t1", amount_cents: 2000, subcategory: "Snacks y dulces" },
      { transaction_id: "t1", amount_cents: 1500, subcategory: "Bebidas" },
    ];
    const db = {
      from(table: string) {
        if (table === "transactions") return chainable({ data: rowsWithId, error: null });
        if (table === "household_members") return chainable({ data: members, error: null });
        if (table === "transaction_items") return chainable({ data: items, error: null });
        if (table === "accounts") return chainable({ data: [{ id: "acc-banco" }], error: null });
        throw new Error(`unexpected table ${table}`);
      },
    } as Parameters<typeof computeFinanceQueryFacts>[0];
    const facts = await computeFinanceQueryFacts(db, "household-1", "user-1", {
      query_type: "item_spending",
      filters: { ...baseFilters, subcategory: "snacks" },
    });
    if (facts.kind !== "item_spending" || facts.empty) throw new Error("expected populated item_spending facts");
    expect(facts.items).toEqual([{ subcategory: "Snacks y dulces", amount_cents: 2000 }]);
  });

  it("returns empty item_spending facts when there are no items", async () => {
    const rowsWithId = [{ type: "expense", amount_cents: 8400, description: "Mercadona", transaction_date: "2026-08-02", created_by: "user-1", scope: "shared", account_id: "acc-banco", categories: { name: "Supermercado" }, accounts: { name: "Banco" }, id: "t1" }];
    const db = {
      from(table: string) {
        if (table === "transactions") return chainable({ data: rowsWithId, error: null });
        if (table === "household_members") return chainable({ data: members, error: null });
        if (table === "transaction_items") return chainable({ data: [], error: null });
        if (table === "accounts") return chainable({ data: [{ id: "acc-banco" }], error: null });
        throw new Error(`unexpected table ${table}`);
      },
    } as Parameters<typeof computeFinanceQueryFacts>[0];
    const facts = await computeFinanceQueryFacts(db, "household-1", "user-1", {
      query_type: "item_spending",
      filters: baseFilters,
    });
    expect(facts).toEqual({ kind: "item_spending", scope: "shared", rangeLabel: "todo el historial", empty: true });
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

  it("lists active accounts straight from the accounts table, not from transaction activity", async () => {
    const accounts = [
      { name: "Banco", type: "bank", is_shared: true },
      { name: "Efectivo", type: "cash", is_shared: false },
    ];
    const db = {
      from(table: string) {
        if (table === "accounts") return chainable({ data: accounts, error: null });
        throw new Error(`unexpected table ${table}`);
      },
    } as Parameters<typeof computeFinanceQueryFacts>[0];
    const facts = await computeFinanceQueryFacts(db, "household-1", "user-1", {
      query_type: "account_list",
      filters: baseFilters,
    });
    expect(facts).toEqual({
      kind: "account_list",
      scope: "shared",
      accounts: [
        { name: "Banco", type: "Banco", shared: true },
        { name: "Efectivo", type: "Efectivo", shared: false },
      ],
    });
  });

  it("only includes the expense amount for an expense-only period summary, never a stray zero income", async () => {
    const db = createDb(rows, members);
    const facts = await computeFinanceQueryFacts(db, "household-1", "user-1", {
      query_type: "period_summary",
      filters: { ...baseFilters, movement_type: "expense" },
    });
    expect(facts).toEqual({
      kind: "summary",
      scope: "shared",
      rangeLabel: "todo el historial",
      movementType: "expense",
      amount: 35_000,
    });
    expect(facts).not.toHaveProperty("totals");
    const reply = formatFinanceReply(facts);
    expect(reply).toContain("de gastos");
    expect(reply).not.toContain("ingresos");
  });
});

describe("user_contributions labels a departed member's anonymized rows", () => {
  it("shows 'Miembro eliminado' for a null created_by", async () => {
    const rowsWithDeparted: Row[] = [
      ...rows,
      { type: "expense", amount_cents: 1_200, description: "Gasto viejo", transaction_date: "2026-08-04", created_by: null, scope: "shared", account_id: "acc-efectivo", categories: { name: "Ocio" }, accounts: { name: "Efectivo" } },
    ];
    const db = createDb(rowsWithDeparted, members);
    const facts = await computeFinanceQueryFacts(db, "household-1", "user-1", {
      query_type: "user_contributions",
      filters: baseFilters,
    });
    expect(facts.kind).toBe("user_contributions");
    if (facts.kind !== "user_contributions") throw new Error("expected user_contributions facts");
    const departed = facts.members.find((member) => member.name === "Miembro eliminado");
    expect(departed).toEqual({ name: "Miembro eliminado", income: 0, expenses: 1_200 });
  });
});

describe("user_contributions uses role labels, never real names", () => {
  it("labels the asker as 'Tú' and the other member as 'Tu pareja'", async () => {
    const db = createDb(rows, members);
    const facts = await computeFinanceQueryFacts(db, "household-1", "user-1", {
      query_type: "user_contributions",
      filters: baseFilters,
    });
    expect(facts.kind).toBe("user_contributions");
    if (facts.kind !== "user_contributions") throw new Error("expected user_contributions facts");
    expect(facts.members.map((member) => member.name).sort()).toEqual(["Tu pareja", "Tú"]);
  });
});

describe("user_name filter resolves by role, not by real name", () => {
  it("filters to the asker's own rows for 'tú'", async () => {
    const db = createDb(rows, members);
    const facts = await computeFinanceQueryFacts(db, "household-1", "user-1", {
      query_type: "household_balance",
      filters: { ...baseFilters, user_name: "tú" },
    });
    expect(facts).toEqual({ kind: "household_balance", scope: "shared", totals: { income: 100_000, expenses: 30_000, result: 70_000 } });
  });

  it("filters to the partner's rows for 'tu pareja'", async () => {
    const db = createDb(rows, members);
    const facts = await computeFinanceQueryFacts(db, "household-1", "user-1", {
      query_type: "household_balance",
      filters: { ...baseFilters, user_name: "tu pareja" },
    });
    expect(facts).toEqual({ kind: "household_balance", scope: "shared", totals: { income: 0, expenses: 5_000, result: -5_000 } });
  });
});

describe("search_text filters by merchant/keyword in the description", () => {
  it("sums only the rows whose description matches the search term", async () => {
    const db = createDb(rows, members);
    const facts = await computeFinanceQueryFacts(db, "household-1", "user-1", {
      query_type: "period_summary",
      filters: { ...baseFilters, movement_type: "expense", search_text: "super" },
    });
    expect(facts).toEqual({ kind: "summary", scope: "shared", rangeLabel: "todo el historial", movementType: "expense", amount: 30_000 });
  });
});

describe("average_daily_spend", () => {
  it("divides total expenses by the number of days in the resolved period", async () => {
    const db = createDb(rows, members);
    const facts = await computeFinanceQueryFacts(db, "household-1", "user-1", {
      query_type: "average_daily_spend",
      filters: { ...baseFilters, period: "current_month" },
    }, new Date("2026-08-03T10:00:00Z"));
    expect(facts).toEqual({ kind: "average_daily_spend", scope: "shared", rangeLabel: "el mes corriente", totalExpenses: 35_000, dailyAverage: 11_667, daysLabel: "3" });
  });
});

describe("spending_ratio", () => {
  it("divides the total of category A by the average transaction of category B", async () => {
    const db = createDb(rows, members);
    const facts = await computeFinanceQueryFacts(db, "household-1", "user-1", {
      query_type: "spending_ratio",
      filters: { ...baseFilters, ratio_category_a: "Supermercado", ratio_category_b: "Ocio" },
    });
    expect(facts).toEqual({ kind: "spending_ratio", rangeLabel: "todo el historial", labelA: "Supermercado", labelB: "Ocio", amountA: 30_000, avgB: 5_000, countLabel: "6" });
  });

  it("reports empty when one side has no matching expenses", async () => {
    const db = createDb(rows, members);
    const facts = await computeFinanceQueryFacts(db, "household-1", "user-1", {
      query_type: "spending_ratio",
      filters: { ...baseFilters, ratio_category_a: "Supermercado", ratio_category_b: "Inexistente" },
    });
    expect(facts).toEqual({ kind: "spending_ratio", rangeLabel: "todo el historial", labelA: "Supermercado", labelB: "Inexistente", empty: true });
  });
});

describe("category_trend", () => {
  const trendRows: Row[] = [
    { type: "expense", amount_cents: 3_000, description: "Cena", transaction_date: "2026-07-10", created_by: "user-1", scope: "shared", account_id: "acc-banco", categories: { name: "Restaurantes" }, accounts: { name: "Banco" } },
    { type: "expense", amount_cents: 8_000, description: "Cena", transaction_date: "2026-08-05", created_by: "user-1", scope: "shared", account_id: "acc-banco", categories: { name: "Restaurantes" }, accounts: { name: "Banco" } },
    { type: "expense", amount_cents: 10_000, description: "Super", transaction_date: "2026-08-02", created_by: "user-1", scope: "shared", account_id: "acc-banco", categories: { name: "Supermercado" }, accounts: { name: "Banco" } },
  ];

  it("breaks down a single category's spend by month", async () => {
    const db = createDb(trendRows, members);
    const facts = await computeFinanceQueryFacts(db, "household-1", "user-1", {
      query_type: "category_trend",
      filters: { ...baseFilters, category: "Restaurantes", period: "custom", date_from: "2026-07-01", date_to: "2026-08-31" },
    });
    expect(facts).toEqual({
      kind: "category_trend",
      scope: "shared",
      categoryLabel: "Restaurantes",
      months: [{ month: "2026-07", amount_cents: 3_000 }, { month: "2026-08", amount_cents: 8_000 }],
    });
  });

  it("reports no data when the category has no expenses in range", async () => {
    const db = createDb(trendRows, members);
    const facts = await computeFinanceQueryFacts(db, "household-1", "user-1", {
      query_type: "category_trend",
      filters: { ...baseFilters, category: "Inexistente", period: "custom", date_from: "2026-07-01", date_to: "2026-08-31" },
    });
    expect(facts.kind).toBe("no_data");
  });
});

describe("subcategory_trend", () => {
  const itemRows = [
    { type: "expense", amount_cents: 5_000, description: "Super", transaction_date: "2026-07-15", created_by: "user-1", scope: "shared", account_id: "acc-banco", categories: { name: "Supermercado" }, accounts: { name: "Banco" }, id: "t1" },
    { type: "expense", amount_cents: 6_000, description: "Super", transaction_date: "2026-08-05", created_by: "user-1", scope: "shared", account_id: "acc-banco", categories: { name: "Supermercado" }, accounts: { name: "Banco" }, id: "t2" },
  ];
  const items = [
    { transaction_id: "t1", amount_cents: 2_000, subcategory: "Snacks y dulces" },
    { transaction_id: "t2", amount_cents: 3_000, subcategory: "Snacks y dulces" },
    { transaction_id: "t2", amount_cents: 1_000, subcategory: "Bebidas" },
  ];

  it("breaks down a single subcategory's item spend by month", async () => {
    const db = {
      from(table: string) {
        if (table === "transactions") return chainable({ data: itemRows, error: null });
        if (table === "household_members") return chainable({ data: members, error: null });
        if (table === "transaction_items") return chainable({ data: items, error: null });
        if (table === "accounts") return chainable({ data: [{ id: "acc-banco" }], error: null });
        throw new Error(`unexpected table ${table}`);
      },
    } as Parameters<typeof computeFinanceQueryFacts>[0];
    const facts = await computeFinanceQueryFacts(db, "household-1", "user-1", {
      query_type: "subcategory_trend",
      filters: { ...baseFilters, subcategory: "snacks", period: "custom", date_from: "2026-07-01", date_to: "2026-08-31" },
    });
    expect(facts).toEqual({
      kind: "subcategory_trend",
      scope: "shared",
      subcategoryLabel: "snacks",
      months: [{ month: "2026-07", amount_cents: 2_000 }, { month: "2026-08", amount_cents: 3_000 }],
    });
  });

  it("reports empty when no items match the requested subcategory", async () => {
    const db = {
      from(table: string) {
        if (table === "transactions") return chainable({ data: itemRows, error: null });
        if (table === "household_members") return chainable({ data: members, error: null });
        if (table === "transaction_items") return chainable({ data: items, error: null });
        if (table === "accounts") return chainable({ data: [{ id: "acc-banco" }], error: null });
        throw new Error(`unexpected table ${table}`);
      },
    } as Parameters<typeof computeFinanceQueryFacts>[0];
    const facts = await computeFinanceQueryFacts(db, "household-1", "user-1", {
      query_type: "subcategory_trend",
      filters: { ...baseFilters, subcategory: "limpieza", period: "custom", date_from: "2026-07-01", date_to: "2026-08-31" },
    });
    expect(facts).toEqual({ kind: "subcategory_trend", scope: "shared", subcategoryLabel: "limpieza", empty: true });
  });
});

describe("savings_opportunities", () => {
  const monthlyRows: Row[] = [
    { type: "expense", amount_cents: 3_000, description: "Cena", transaction_date: "2026-07-10", created_by: "user-1", scope: "shared", account_id: "acc-banco", categories: { name: "Restaurantes" }, accounts: { name: "Banco" } },
    { type: "expense", amount_cents: 8_000, description: "Cena", transaction_date: "2026-08-05", created_by: "user-1", scope: "shared", account_id: "acc-banco", categories: { name: "Restaurantes" }, accounts: { name: "Banco" } },
    { type: "expense", amount_cents: 10_000, description: "Super", transaction_date: "2026-07-02", created_by: "user-1", scope: "shared", account_id: "acc-banco", categories: { name: "Supermercado" }, accounts: { name: "Banco" } },
    { type: "expense", amount_cents: 9_000, description: "Super", transaction_date: "2026-08-02", created_by: "user-1", scope: "shared", account_id: "acc-banco", categories: { name: "Supermercado" }, accounts: { name: "Banco" } },
  ];

  it("ranks categories whose expenses grew from the previous month to the current one", async () => {
    const db = createDb(monthlyRows, members);
    const facts = await computeFinanceQueryFacts(
      db, "household-1", "user-1",
      { query_type: "savings_opportunities", filters: baseFilters },
      new Date("2026-08-15T10:00:00Z"),
    );
    expect(facts).toEqual({
      kind: "savings_opportunities",
      scope: "shared",
      targetMonth: "2026-08",
      previousMonth: "2026-07",
      risingCategories: [{ name: "Restaurantes", current: 8_000, previous: 3_000, increase: 5_000 }],
    });
  });

  it("reports empty when nothing increased month over month", async () => {
    const db = createDb(monthlyRows, members);
    const facts = await computeFinanceQueryFacts(
      db, "household-1", "user-1",
      { query_type: "savings_opportunities", filters: { ...baseFilters, category: "Supermercado" } },
      new Date("2026-08-15T10:00:00Z"),
    );
    expect(facts).toEqual({ kind: "savings_opportunities", scope: "shared", targetMonth: "2026-08", previousMonth: "2026-07", empty: true });
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
      `💰 El saldo actual de el hogar es ${formatMoney(65_000)}: ${formatMoney(100_000)} de ingresos menos ${formatMoney(35_000)} de gastos registrados.`,
    );
  });

  it("formats account_list facts, singular vs plural", () => {
    expect(formatFinanceReply({ kind: "account_list", scope: "shared", accounts: [] })).toBe(
      "🤷 No tenés cuentas activas en el hogar todavía.",
    );
    expect(
      formatFinanceReply({
        kind: "account_list",
        scope: "personal",
        accounts: [{ name: "Efectivo", type: "Efectivo", shared: false }],
      }),
    ).toBe("🏦 Tenés 1 cuenta activa en tu espacio personal: Efectivo (Efectivo).");
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
