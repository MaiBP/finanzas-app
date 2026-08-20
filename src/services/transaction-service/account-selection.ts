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

// Determines whether the parser's chosen scope leaves more than one candidate account — if so, the
// app must ask instead of guessing (see accountOptionsForSelection below for what's actually shown).
// Deliberately narrow (never mixes in the other scope's accounts) so a household with exactly one
// shared account still auto-assigns it instead of asking a question just because the user also
// happens to have a personal account.
export function accountsForAction(action: CreateTransactionAction, accounts: AccountOption[]) {
  return accounts.filter(account => account.is_shared === (action.data.scope === "shared"));
}

// Once accountsForAction (above) has already decided a question is needed, this widens the actual
// button list: "shared" is the parser's default whenever a message doesn't name a space, so this is
// the one rescue point where a misclassified personal expense can still be redirected without
// retyping the whole message. "personal" only ever comes from an explicit mention (the parser never
// defaults to it), so there's no equivalent need to also offer shared accounts there.
export function accountOptionsForSelection(action: CreateTransactionAction, accounts: AccountOption[]) {
  return action.data.scope === "personal" ? accounts.filter(account => !account.is_shared) : accounts;
}

// Personal accounts get a lock prefix whenever they might appear alongside shared ones (see
// accountOptionsForSelection above), so it's obvious at a glance which button keeps a movement private.
export function accountButtonLabel(account: AccountOption, isSelected: boolean) {
  if (isSelected) return `✅ ${account.name}`;
  return `${account.is_shared ? "" : "🔒"}${accountEmoji(account.type)} ${account.name}`;
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
// voice note (or a misread text message) before it ever reaches confirmation. When the user also
// asked to create a brand-new account (not possible from Telegram), this leads with that instead
// — reused by every caller (single eligible account or several) so the note is never missed.
export function describeCreateTransaction(action: CreateTransactionAction) {
  const emoji = action.data.type === "expense" ? "💸" : "💰";
  const noun = action.data.type === "expense" ? "gasto" : "ingreso";
  const detail = `${emoji} Identifiqué un ${noun} de ${formatMoney(action.data.amount_cents)} en “${action.data.description}” (${action.data.category}).`;
  if (!action.data.wants_new_account) return detail;
  const scopeWord = action.data.scope === "shared" ? "conjunta" : "personal";
  return `Para crear una cuenta ${scopeWord} deberás ingresar a la web con tu usuario.\n\n${detail}`;
}

// No text list of accounts here — the options are already the inline keyboard buttons
// (accountOptionsForSelection + accountButtonLabel), so repeating them as text would be redundant.
export function accountSelectionQuestion(action: CreateTransactionAction) {
  const question = action.data.wants_new_account
    ? "¿Deseas registrarlo de todos modos en una cuenta existente?"
    : action.data.type === "expense" ? "🤔 ¿De qué cuenta sale el dinero?" : "🤔 ¿En qué cuenta entra el dinero?";
  return `${describeCreateTransaction(action)}\n\n${question}`;
}
