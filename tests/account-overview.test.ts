import { describe, expect, it } from "vitest";
import { calculateAccountBalance, calculateBaseForTargetBalance, calculateParticipantExpenses } from "@/lib/finance/account-overview";

describe("shared account overview", () => {
  it("calculates the signed current balance for one account", () => {
    expect(calculateAccountBalance(10_000,"joint",[
      {account_id:"joint",type:"income",amount_cents:5_000},
      {account_id:"joint",type:"expense",amount_cents:12_000},
      {account_id:"other",type:"expense",amount_cents:99_000},
    ])).toBe(3_000);
  });

  it("groups current-month expenses by payer", () => {
    const totals=calculateParticipantExpenses("joint",[
      {account_id:"joint",paid_by:"maira",amount_cents:4_200},
      {account_id:"joint",paid_by:"maira",amount_cents:800},
      {account_id:"joint",paid_by:"pablo",amount_cents:2_500},
      {account_id:"other",paid_by:"pablo",amount_cents:9_999},
    ]);
    expect(totals.get("maira")).toBe(5_000);
    expect(totals.get("pablo")).toBe(2_500);
  });

  it("reconciles the accounting base without changing historical movements", () => {
    const movements = [
      {account_id:"bank",type:"income" as const,amount_cents:200_000},
      {account_id:"bank",type:"expense" as const,amount_cents:32_763},
    ];
    const base = calculateBaseForTargetBalance(196_375, "bank", movements);
    expect(base).toBe(29_138);
    expect(calculateAccountBalance(base, "bank", movements)).toBe(196_375);
  });
});
