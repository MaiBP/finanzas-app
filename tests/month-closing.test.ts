import { describe, expect, it } from "vitest";
import { buildMonthClosingSnapshot, isLastDayOfMonth } from "@/services/month-closing";

describe("isLastDayOfMonth", () => {
  it("recognizes 31-day months", () => {
    expect(isLastDayOfMonth("2026-08-31")).toBe(true);
    expect(isLastDayOfMonth("2026-08-30")).toBe(false);
  });

  it("recognizes 30-day months", () => {
    expect(isLastDayOfMonth("2026-09-30")).toBe(true);
    expect(isLastDayOfMonth("2026-09-29")).toBe(false);
  });

  it("handles February in a leap year", () => {
    expect(isLastDayOfMonth("2028-02-29")).toBe(true);
    expect(isLastDayOfMonth("2028-02-28")).toBe(false);
  });

  it("handles February in a non-leap year", () => {
    expect(isLastDayOfMonth("2026-02-28")).toBe(true);
    expect(isLastDayOfMonth("2026-02-27")).toBe(false);
  });
});

describe("buildMonthClosingSnapshot", () => {
  const accounts = [
    { id: "acc-shared-eur", name: "Banco común", type: "bank", currency: "EUR" },
    { id: "acc-cash-eur", name: "Efectivo de casa", type: "cash", currency: "EUR" },
    { id: "acc-usd", name: "Cuenta en dólares", type: "bank", currency: "USD" },
  ];

  it("sums only base-currency accounts into the total, but keeps every account in the breakdown", () => {
    const movements = [
      { account_id: "acc-shared-eur", type: "income" as const, amount_cents: 200000 },
      { account_id: "acc-shared-eur", type: "expense" as const, amount_cents: 50000 },
      { account_id: "acc-cash-eur", type: "income" as const, amount_cents: 10000 },
      { account_id: "acc-usd", type: "income" as const, amount_cents: 99999 },
    ];
    const { totalBalanceCents, breakdown } = buildMonthClosingSnapshot(accounts, movements, "EUR");
    expect(totalBalanceCents).toBe(200000 - 50000 + 10000);
    expect(breakdown).toEqual([
      { id: "acc-shared-eur", name: "Banco común", type: "bank", currency: "EUR", balance_cents: 150000 },
      { id: "acc-cash-eur", name: "Efectivo de casa", type: "cash", currency: "EUR", balance_cents: 10000 },
      { id: "acc-usd", name: "Cuenta en dólares", type: "bank", currency: "USD", balance_cents: 99999 },
    ]);
  });

  it("returns a zero total and empty breakdown when the household has no shared accounts", () => {
    const { totalBalanceCents, breakdown } = buildMonthClosingSnapshot([], [], "EUR");
    expect(totalBalanceCents).toBe(0);
    expect(breakdown).toEqual([]);
  });
});
