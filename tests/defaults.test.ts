import { describe, expect, it } from "vitest";
import { applyFinancialDefaults } from "@/services/financial-message-parser/defaults";
import type { FinancialAction } from "@/services/financial-message-parser/schema";

const baseAction: FinancialAction = {
  action: "create_transaction",
  confidence: 0.96,
  requires_confirmation: false,
  data: {
    type: "expense",
    amount_cents: 4200,
    currency: "EUR",
    description: "Compra en Mercadona",
    category: "Supermercado",
    scope: "personal",
    privacy: "private",
    transaction_date: "2026-08-03",
    paid_by: "current_user",
    account_name: null,
    split_type: "single",
    wants_new_account: false,
  },
};

describe("financial conversational defaults", () => {
  it("makes an unspecified expense shared, visible and equally split", () => {
    const result = applyFinancialDefaults(baseAction, "Gasté 42 euros en Mercadona");
    expect(result.action === "create_transaction" && result.data).toMatchObject({
      scope: "shared",
      privacy: "visible",
      split_type: "equal",
    });
  });

  it.each(["Es un gasto personal", "Esto es solo para mí", "No es compartido"])(
    "respects explicit personal intent: %s",
    (text) => {
      const result = applyFinancialDefaults({ ...baseAction, data: { ...baseAction.data, scope: "shared" } }, text);
      expect(result.action === "create_transaction" && result.data.scope).toBe("personal");
      expect(result.action === "create_transaction" && result.data.privacy).toBe("private");
      expect(result.action === "create_transaction" && result.data.split_type).toBe("single");
    },
  );

  it("does not alter non-create actions", () => {
    const query: FinancialAction = {
      action: "query_finances",
      confidence: 0.9,
      requires_confirmation: false,
      data: {
        query_type: "month_summary",
        filters: { category: null, subcategory: null, user_name: null, account_name: null, search_text: null, ratio_category_a: null, ratio_category_b: null, date_from: null, date_to: null, month: null, period: "current_month", movement_type: "both", limit: null, scope: "personal", include_deleted_accounts: false },
      },
    };
    expect(applyFinancialDefaults(query, "¿Cuánto gastamos?")).toBe(query);
  });

  it("reroutes a category filter that isn't a real category name into search_text", () => {
    const query: FinancialAction = {
      action: "query_finances",
      confidence: 0.9,
      requires_confirmation: false,
      data: {
        query_type: "category_spending",
        filters: { category: "café", subcategory: null, user_name: null, account_name: null, search_text: null, ratio_category_a: null, ratio_category_b: null, date_from: null, date_to: null, month: null, period: "current_month", movement_type: "both", limit: null, scope: "shared", include_deleted_accounts: false },
      },
    };
    const result = applyFinancialDefaults(query, "¿Cuánto gastamos en café?", [{ name: "Restaurantes" }, { name: "Supermercado" }]);
    expect(result.action === "query_finances" && result.data.filters.category).toBeNull();
    expect(result.action === "query_finances" && result.data.filters.search_text).toBe("café");
  });

  it("leaves a category filter alone when it matches a real category name", () => {
    const query: FinancialAction = {
      action: "query_finances",
      confidence: 0.9,
      requires_confirmation: false,
      data: {
        query_type: "category_spending",
        filters: { category: "Restaurantes", subcategory: null, user_name: null, account_name: null, search_text: null, ratio_category_a: null, ratio_category_b: null, date_from: null, date_to: null, month: null, period: "current_month", movement_type: "both", limit: null, scope: "shared", include_deleted_accounts: false },
      },
    };
    const result = applyFinancialDefaults(query, "¿Cuánto gastamos en Restaurantes?", [{ name: "Restaurantes" }, { name: "Supermercado" }]);
    expect(result.action === "query_finances" && result.data.filters.category).toBe("Restaurantes");
    expect(result.action === "query_finances" && result.data.filters.search_text).toBeNull();
  });

  it("flips include_deleted_accounts to true only when the user explicitly asks for historical/deleted-account data", () => {
    const query: FinancialAction = {
      action: "query_finances",
      confidence: 0.9,
      requires_confirmation: false,
      data: {
        query_type: "account_summary",
        filters: { category: null, subcategory: null, user_name: null, account_name: null, search_text: null, ratio_category_a: null, ratio_category_b: null, date_from: null, date_to: null, month: null, period: "current_month", movement_type: "both", limit: null, scope: "shared", include_deleted_accounts: false },
      },
    };
    const result = applyFinancialDefaults(query, "Decime el saldo de cada cuenta, incluyendo las cuentas borradas");
    expect(result.action === "query_finances" && result.data.filters.include_deleted_accounts).toBe(true);
  });
});
