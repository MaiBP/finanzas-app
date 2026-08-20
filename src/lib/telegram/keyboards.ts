import type { InlineKeyboardMarkup } from "@/lib/telegram/api";
import { accountButtonLabel, type AccountOption } from "@/services/transaction-service/account-selection";

export function confirmCancelKeyboard(actionType: string): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: "✅ Sí", callback_data: `confirm:yes:${actionType}` },
        { text: "❌ No", callback_data: `confirm:no:${actionType}` },
      ],
    ],
  };
}

export function importReviewKeyboard(): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: "✅ Sí, registrar", callback_data: "confirm:yes:import_statement" },
        { text: "❌ Cancelar", callback_data: "confirm:no:import_statement" },
      ],
      [{ text: "✏️ Editar", callback_data: "edit:import_statement" }],
    ],
  };
}

// Picking an account IS the confirmation — there's no separate "Sí, confirmar" step, since making
// the user tap the account and then also tap confirm is a redundant second decision. Only Cancelar
// stays as the way out.
export function createTransactionDecisionKeyboard(accounts: AccountOption[], selectedAccountName: string | null): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      ...accounts.map((account, index) => [
        { text: accountButtonLabel(account, account.name === selectedAccountName), callback_data: `account:${index + 1}` },
      ]),
      [{ text: "❌ Cancelar", callback_data: "confirm:no:create_transaction" }],
    ],
  };
}

// Same "picking an account is the confirmation" idea as createTransactionDecisionKeyboard — Editar
// stays since there's real content (the extracted movements/products) worth reviewing before it
// commits, but there's no separate "Sí, registrar" once an account is tapped.
export function importDecisionKeyboard(accounts: AccountOption[], selectedAccountName: string | null): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      ...accounts.map((account, index) => [
        { text: accountButtonLabel(account, account.name === selectedAccountName), callback_data: `import-account:${index + 1}` },
      ]),
      [
        { text: "✏️ Editar", callback_data: "edit:import_statement" },
        { text: "❌ Cancelar", callback_data: "confirm:no:import_statement" },
      ],
    ],
  };
}
