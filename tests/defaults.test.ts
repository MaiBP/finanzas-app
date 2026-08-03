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
        filters: { category: null, user_name: null, date_from: null, date_to: null, month: null },
      },
    };
    expect(applyFinancialDefaults(query, "¿Cuánto gastamos?")).toBe(query);
  });
});
