import type { InlineKeyboardMarkup } from "@/lib/telegram/api";
import type { AccountOption } from "@/services/transaction-service/account-selection";

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

export function accountSelectionKeyboard(accounts: AccountOption[]): InlineKeyboardMarkup {
  return {
    inline_keyboard: accounts.map((account, index) => [
      { text: account.name, callback_data: `account:${index + 1}` },
    ]),
  };
}
