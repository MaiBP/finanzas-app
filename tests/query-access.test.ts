import { describe, expect, it } from "vitest";
import {
  accessibleFinanceFilter,
  calculateTransactionTotals,
  resolveFinancePeriod,
} from "@/services/query-service";

describe("bot finance access", () => {
  it("includes shared transactions and only the requesting user's personal transactions", () => {
    expect(accessibleFinanceFilter("user-123")).toBe("scope.eq.shared,and(scope.eq.personal,created_by.eq.user-123)");
  });

  it("resolves the current year through today for annual accumulated queries", () => {
    expect(resolveFinancePeriod({
      category: null,
      user_name: null,
      account_name: null,
      search_text: null,
      ratio_category_a: null,
      ratio_category_b: null,
      date_from: null,
      date_to: null,
      month: null,
      period: "current_year",
      movement_type: "both",
      limit: null,
      scope: "shared",
    }, new Date("2026-08-06T08:00:00Z"))).toEqual({
      from: "2026-01-01",
      to: "2026-08-06",
      label: "2026 hasta hoy",
    });
  });

  it("calculates income, expenses and result from confirmed rows", () => {
    expect(calculateTransactionTotals([
      { type: "income", amount_cents: 400_000 },
      { type: "expense", amount_cents: 363_743 },
    ])).toEqual({ income: 400_000, expenses: 363_743, result: 36_257 });
  });
});
