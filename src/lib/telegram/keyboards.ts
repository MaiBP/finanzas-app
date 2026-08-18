import type { InlineKeyboardMarkup } from "@/lib/telegram/api";
import { accountEmoji, type AccountOption } from "@/services/transaction-service/account-selection";

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

// Same combined-keyboard idea as importDecisionKeyboard: account buttons plus Sí/Cancelar
// together, tapping an account re-renders this markup with it checked off instead of losing the
// confirm/cancel options. selectedAccountName is null until an account has been picked.
export function createTransactionDecisionKeyboard(accounts: AccountOption[], selectedAccountName: string | null): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      ...accounts.map((account, index) => [
        { text: `${account.name === selectedAccountName ? "✅" : accountEmoji(account.type)} ${account.name}`, callback_data: `account:${index + 1}` },
      ]),
      [
        { text: "✅ Sí, confirmar", callback_data: "confirm:yes:create_transaction" },
        { text: "❌ Cancelar", callback_data: "confirm:no:create_transaction" },
      ],
    ],
  };
}

// Account buttons and the confirm/edit/cancel row together in one keyboard: tapping an account
// re-renders this same markup with that account checked off, without losing the other actions.
// selectedAccountName is null until an account has been picked (by button or by typing).
export function importDecisionKeyboard(accounts: AccountOption[], selectedAccountName: string | null): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      ...accounts.map((account, index) => [
        { text: `${account.name === selectedAccountName ? "✅" : accountEmoji(account.type)} ${account.name}`, callback_data: `import-account:${index + 1}` },
      ]),
      [
        { text: "✅ Sí, registrar", callback_data: "confirm:yes:import_statement" },
        { text: "✏️ Editar", callback_data: "edit:import_statement" },
        { text: "❌ Cancelar", callback_data: "confirm:no:import_statement" },
      ],
    ],
  };
}
