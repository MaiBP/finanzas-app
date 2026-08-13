import type { FinancialAction } from "@/services/financial-message-parser/schema";

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

export function accountSelectionQuestion(action: CreateTransactionAction, accounts: AccountOption[]) {
  const question = action.data.type === "expense" ? "🤔 ¿De qué cuenta sale el dinero?" : "🤔 ¿En qué cuenta entra el dinero?";
  return `${question}\n${accounts.map((account, index) => `${index + 1}. ${accountEmoji(account.type)} ${account.name}`).join("\n")}\nResponde con el número o el nombre de la cuenta.`;
}
