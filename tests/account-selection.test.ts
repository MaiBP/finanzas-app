import { describe, expect, it } from "vitest";
import type { CreateTransactionAction } from "@/services/transaction-service/account-selection";
import { accountSelectionQuestion, accountsForAction, assignOnlyAccount, describeCreateTransaction, matchAccountSelection } from "@/services/transaction-service/account-selection";
import { confirmCancelKeyboard, createTransactionDecisionKeyboard } from "@/lib/telegram/keyboards";

const action: CreateTransactionAction = {
  action: "create_transaction",
  confidence: .98,
  requires_confirmation: false,
  data: {
    type: "expense", amount_cents: 2500, currency: "EUR", description: "Compra semanal",
    category: "Supermercado", scope: "shared", privacy: "visible", transaction_date: "2026-08-04",
    paid_by: "current_user", account_name: null, split_type: "equal",
  },
};

const accounts = [
  { name: "Efectivo de casa", is_shared: true },
  { name: "Banco común", is_shared: true },
  { name: "Mi efectivo", is_shared: false },
];

describe("account selection", () => {
  it("uses the only eligible account automatically", () => {
    const selected = assignOnlyAccount(action, accountsForAction(action, [accounts[0], accounts[2]]));
    expect(selected.data.account_name).toBe("Efectivo de casa");
  });

  it("keeps the account empty and asks when several accounts are eligible", () => {
    const eligible = accountsForAction(action, accounts);
    expect(assignOnlyAccount(action, eligible).data.account_name).toBeNull();
    expect(accountSelectionQuestion(action, eligible)).toContain("¿De qué cuenta sale el dinero?");
  });

  it("describes the identified expense/income before asking anything", () => {
    expect(describeCreateTransaction(action)).toBe("💸 Identifiqué un gasto de 25,00 € en “Compra semanal” (Supermercado).");
    const income = { ...action, data: { ...action.data, type: "income" as const } };
    expect(describeCreateTransaction(income)).toContain("💰 Identifiqué un ingreso de");
    expect(accountSelectionQuestion(action, accountsForAction(action, accounts))).toContain("Identifiqué un gasto");
  });

  it("asks where an income enters and only offers personal accounts for personal movements", () => {
    const personalIncome = { ...action, data: { ...action.data, type: "income" as const, scope: "personal" as const } };
    const eligible = accountsForAction(personalIncome, accounts);
    expect(eligible.map(account => account.name)).toEqual(["Mi efectivo"]);
    expect(accountSelectionQuestion(personalIncome, eligible)).toContain("¿En qué cuenta entra el dinero?");
  });

  it("accepts a number, an exact name or an unambiguous mention", () => {
    const eligible = accountsForAction(action, accounts);
    expect(matchAccountSelection("2", eligible)?.name).toBe("Banco común");
    expect(matchAccountSelection("banco comun", eligible)?.name).toBe("Banco común");
    expect(matchAccountSelection("Usa Efectivo de casa", eligible)?.name).toBe("Efectivo de casa");
  });
});

describe("telegram inline keyboards", () => {
  it("builds one button per account (1-based callback index) plus a confirm/cancel row", () => {
    const eligible = accountsForAction(action, accounts);
    expect(createTransactionDecisionKeyboard(eligible, null)).toEqual({
      inline_keyboard: [
        [{ text: "🏦 Efectivo de casa", callback_data: "account:1" }],
        [{ text: "🏦 Banco común", callback_data: "account:2" }],
        [
          { text: "✅ Sí, confirmar", callback_data: "confirm:yes:create_transaction" },
          { text: "❌ Cancelar", callback_data: "confirm:no:create_transaction" },
        ],
      ],
    });
  });

  it("checks off the selected account instead of its emoji", () => {
    const eligible = accountsForAction(action, accounts);
    const keyboard = createTransactionDecisionKeyboard(eligible, "Banco común");
    expect(keyboard.inline_keyboard[0][0].text).toBe("🏦 Efectivo de casa");
    expect(keyboard.inline_keyboard[1][0].text).toBe("✅ Banco común");
  });

  it("builds a confirm/cancel row carrying the action type", () => {
    expect(confirmCancelKeyboard("create_transaction")).toEqual({
      inline_keyboard: [[
        { text: "✅ Sí", callback_data: "confirm:yes:create_transaction" },
        { text: "❌ No", callback_data: "confirm:no:create_transaction" },
      ]],
    });
  });
});
