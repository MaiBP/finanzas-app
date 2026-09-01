import { describe, expect, it } from "vitest";
import type { CreateTransactionAction } from "@/services/transaction-service/account-selection";
import { accountOptionsForSelection, accountSelectionQuestion, accountsForAction, assignOnlyAccount, describeCreateTransaction, matchAccountSelection } from "@/services/transaction-service/account-selection";
import { confirmCancelKeyboard, createTransactionDecisionKeyboard } from "@/lib/telegram/keyboards";

const action: CreateTransactionAction = {
  action: "create_transaction",
  confidence: .98,
  requires_confirmation: false,
  data: {
    type: "expense", amount_cents: 2500, currency: "EUR", description: "Compra semanal",
    category: "Supermercado", scope: "shared", privacy: "visible", transaction_date: "2026-08-04",
    paid_by: "current_user", account_name: null, split_type: "equal", wants_new_account: false,
    scope_explicit: true,
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
    expect(accountSelectionQuestion(action)).toContain("¿De qué cuenta sale el dinero?");
  });

  it("describes the identified expense/income before asking anything", () => {
    expect(describeCreateTransaction(action)).toBe("💸 Identifiqué un gasto de 25,00 € en “Compra semanal” (Supermercado).");
    const income = { ...action, data: { ...action.data, type: "income" as const } };
    expect(describeCreateTransaction(income)).toContain("💰 Identifiqué un ingreso de");
    expect(accountSelectionQuestion(action)).toContain("Identifiqué un gasto");
  });

  it("asks where an income enters and only offers personal accounts for personal movements", () => {
    const personalIncome = { ...action, data: { ...action.data, type: "income" as const, scope: "personal" as const } };
    const eligible = accountsForAction(personalIncome, accounts);
    expect(eligible.map(account => account.name)).toEqual(["Mi efectivo"]);
    expect(accountSelectionQuestion(personalIncome)).toContain("¿En qué cuenta entra el dinero?");
  });

  it("accepts a number, an exact name or an unambiguous mention", () => {
    const eligible = accountsForAction(action, accounts);
    expect(matchAccountSelection("2", eligible)?.name).toBe("Banco común");
    expect(matchAccountSelection("banco comun", eligible)?.name).toBe("Banco común");
    expect(matchAccountSelection("Usa Efectivo de casa", eligible)?.name).toBe("Efectivo de casa");
  });

  it("widens the button list to also offer personal accounts once a shared movement is already ambiguous", () => {
    const options = accountOptionsForSelection(action, accounts);
    expect(options.map(account => account.name)).toEqual(["Efectivo de casa", "Banco común", "Mi efectivo"]);
  });

  it("never widens a personal movement's button list with shared accounts", () => {
    const personal = { ...action, data: { ...action.data, scope: "personal" as const } };
    const options = accountOptionsForSelection(personal, accounts);
    expect(options.map(account => account.name)).toEqual(["Mi efectivo"]);
  });

  it("explains that Telegram can't create accounts, and offers an existing one instead", () => {
    const wantsNewAccount = { ...action, data: { ...action.data, wants_new_account: true } };
    const description = describeCreateTransaction(wantsNewAccount);
    expect(description).toContain("Para crear una cuenta conjunta deberás ingresar a la web con tu usuario.");
    expect(description).toContain("Identifiqué un gasto");
    const question = accountSelectionQuestion(wantsNewAccount);
    expect(question).toContain("¿Deseas registrarlo de todos modos en una cuenta existente?");
  });

  it("asks instead of guessing when the message didn't name a space and both scopes have accounts", () => {
    const implicit = { ...action, data: { ...action.data, scope_explicit: false } };
    const eligible = accountsForAction(implicit, [accounts[0], accounts[2]]);
    expect(eligible.map(a => a.name)).toEqual(["Efectivo de casa", "Mi efectivo"]);
    expect(assignOnlyAccount(implicit, eligible).data.account_name).toBeNull();
  });

  it("still auto-assigns an implicit-scope movement when only one account exists overall, and corrects scope to match it", () => {
    const implicit = { ...action, data: { ...action.data, scope_explicit: false } };
    const eligible = accountsForAction(implicit, [accounts[2]]);
    const assigned = assignOnlyAccount(implicit, eligible);
    expect(assigned.data.account_name).toBe("Mi efectivo");
    expect(assigned.data.scope).toBe("personal");
    expect(assigned.data.privacy).toBe("private");
  });
});

describe("telegram inline keyboards", () => {
  it("builds one button per account (1-based callback index) plus a cancel row — no separate confirm, picking the account is the confirmation", () => {
    const eligible = accountsForAction(action, accounts);
    expect(createTransactionDecisionKeyboard(eligible, null)).toEqual({
      inline_keyboard: [
        [{ text: "🏦 Efectivo de casa", callback_data: "account:1" }],
        [{ text: "🏦 Banco común", callback_data: "account:2" }],
        [{ text: "❌ Cancelar", callback_data: "confirm:no:create_transaction" }],
      ],
    });
  });

  it("checks off the selected account instead of its emoji", () => {
    const eligible = accountsForAction(action, accounts);
    const keyboard = createTransactionDecisionKeyboard(eligible, "Banco común");
    expect(keyboard.inline_keyboard[0][0].text).toBe("🏦 Efectivo de casa");
    expect(keyboard.inline_keyboard[1][0].text).toBe("✅ Banco común");
  });

  it("marks a personal account with a lock when it's offered alongside shared ones", () => {
    const options = accountOptionsForSelection(action, accounts);
    const keyboard = createTransactionDecisionKeyboard(options, null);
    expect(keyboard.inline_keyboard[2][0].text).toBe("🔒🏦 Mi efectivo");
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
