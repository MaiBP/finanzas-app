import { describe, expect, it } from "vitest";
import { calculateAccountBalance, calculateParticipantExpenses } from "@/lib/finance/account-overview";

describe("shared account overview", () => {
  it("calculates the signed current balance for one account", () => {
    expect(calculateAccountBalance("joint",[
      {account_id:"joint",type:"income",amount_cents:5_000},
      {account_id:"joint",type:"expense",amount_cents:12_000},
      {account_id:"other",type:"expense",amount_cents:99_000},
    ])).toBe(-7_000);
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

  it("ignores unregistered balances and uses only movements", () => {
    expect(calculateAccountBalance("bank", [
      {account_id:"bank",type:"income",amount_cents:200_000},
      {account_id:"bank",type:"expense",amount_cents:32_763},
    ])).toBe(167_237);
  });
});
