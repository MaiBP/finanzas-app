import type { FinancialAction } from "@/services/financial-message-parser/schema";
import { formatMoney } from "@/lib/finance/money";

export type AccountOption = { name: string; is_shared: boolean; type?: string };

const ACCOUNT_EMOJIS: Record<string, string> = {
  bank: "🏦",
  card: "💳",
  cash: "💵",
  savings: "🐷",
  investment: "📈",
};

export function accountEmoji(type?: string) {
  return ACCOUNT_EMOJIS[type ?? ""] ?? "🏦";
}
export type CreateTransactionAction = Extract<FinancialAction, { action: "create_transaction" }>;

const normalize = (value: string) => value
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLocaleLowerCase("es")
  .replace(/[^a-z0-9]+/g, " ")
  .trim();

export function accountsForAction(action: CreateTransactionAction, accounts: AccountOption[]) {
  return accounts.filter(account => account.is_shared === (action.data.scope === "shared"));
}

export function assignOnlyAccount(action: CreateTransactionAction, accounts: AccountOption[]) {
  if (action.data.account_name || accounts.length !== 1) return action;
  return { ...action, data: { ...action.data, account_name: accounts[0].name } };
}

export function matchAccountSelection(text: string, accounts: AccountOption[]) {
  const numericChoice = Number(text.trim());
  if (Number.isInteger(numericChoice) && numericChoice >= 1 && numericChoice <= accounts.length) return accounts[numericChoice - 1];

  const normalizedText = normalize(text);
  const exact = accounts.find(account => normalize(account.name) === normalizedText);
  if (exact) return exact;

  const mentioned = accounts.filter(account => normalizedText.includes(normalize(account.name)));
  return mentioned.length === 1 ? mentioned[0] : undefined;
}

// Shown before asking which account, so the user can spot a misheard amount/merchant from a
// voice note (or a misread text message) before it ever reaches confirmation.
export function describeCreateTransaction(action: CreateTransactionAction) {
  const emoji = action.data.type === "expense" ? "💸" : "💰";
  const noun = action.data.type === "expense" ? "gasto" : "ingreso";
  return `${emoji} Identifiqué un ${noun} de ${formatMoney(action.data.amount_cents)} en “${action.data.description}” (${action.data.category}).`;
}

export function accountSelectionQuestion(action: CreateTransactionAction, accounts: AccountOption[]) {
  const question = action.data.type === "expense" ? "🤔 ¿De qué cuenta sale el dinero?" : "🤔 ¿En qué cuenta entra el dinero?";
  const accountList = accounts.map((account, index) => `${index + 1}. ${accountEmoji(account.type)} ${account.name}`).join("\n");
  return `${describeCreateTransaction(action)}\n\n${question}\n${accountList}`;
}
