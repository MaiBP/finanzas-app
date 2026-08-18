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

export function accountSelectionKeyboard(accounts: AccountOption[]): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      ...accounts.map((account, index) => [
        { text: `${accountEmoji(account.type)} ${account.name}`, callback_data: `account:${index + 1}` },
      ]),
      [{ text: "❌ Cancelar", callback_data: "confirm:no:create_transaction" }],
    ],
  };
}

export function importAccountSelectionKeyboard(accounts: AccountOption[]): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      ...accounts.map((account, index) => [
        { text: `${accountEmoji(account.type)} ${account.name}`, callback_data: `import-account:${index + 1}` },
      ]),
      [{ text: "❌ Cancelar", callback_data: "confirm:no:import_statement" }],
    ],
  };
}
