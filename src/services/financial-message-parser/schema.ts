import { z } from "zod";

const transactionItemData = z.object({
  description: z.string().min(1).max(160),
  amount_cents: z.int().positive(),
  subcategory: z.string().min(1).max(60),
});

const transactionData = z.object({
  type: z.enum(["expense", "income"]), amount_cents: z.int().positive(), currency: z.literal("EUR"),
  description: z.string().min(2).max(160), category: z.string().min(1), scope: z.enum(["personal", "shared"]),
  privacy: z.enum(["visible", "private"]), transaction_date: z.iso.date(), paid_by: z.string(),
  account_name: z.string().nullable(), split_type: z.enum(["equal", "single", "percentage"]),
  // OpenAI structured-output strict mode requires every key present (nullable is fine, bare
  // .optional() is not) — see the same fix applied in statement-import's importedTransactionSchema.
  items: z.array(transactionItemData).max(40).nullable().optional(),
  // True when the user asked to create/open a new account alongside this movement — Telegram
  // can't create accounts, so the app explains that and offers an existing one instead. A
  // .default() also satisfies strict mode (has a defaultValue) without needing .nullable().
  wants_new_account: z.boolean().default(false),
});

export const financialActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("create_transaction"), confidence: z.number().min(0).max(1), requires_confirmation: z.boolean(), data: transactionData }),
  z.object({ action: z.literal("update_transaction"), confidence: z.number().min(0).max(1), requires_confirmation: z.literal(true), data: z.object({ reference:z.string(),amount_cents:z.int().positive().nullable(),description:z.string().nullable(),category:z.string().nullable(),scope:z.enum(["personal","shared"]).nullable(),privacy:z.enum(["visible","private"]).nullable(),transaction_date:z.iso.date().nullable(),account_name:z.string().nullable() }) }),
  z.object({ action: z.literal("delete_transaction"), confidence: z.number().min(0).max(1), requires_confirmation: z.literal(true), data: z.object({ transaction_id: z.uuid().nullable(), reference: z.string() }) }),
  z.object({ action: z.literal("query_finances"), confidence: z.number().min(0).max(1), requires_confirmation: z.literal(false), data: z.object({ query_type: z.enum(["month_summary","period_summary","category_spending","item_spending","user_contributions","household_balance","recent_transactions","compare_months","spending_by_date_range","account_list","account_summary","largest_transactions","monthly_trend","average_daily_spend","spending_ratio"]), filters: z.object({category:z.string().nullable(),subcategory:z.string().nullable(),user_name:z.string().nullable(),account_name:z.string().nullable(),search_text:z.string().nullable(),ratio_category_a:z.string().nullable(),ratio_category_b:z.string().nullable(),date_from:z.iso.date().nullable(),date_to:z.iso.date().nullable(),month:z.string().regex(/^\d{4}-\d{2}$/).nullable(),period:z.enum(["current_month","current_year","last_month","last_30_days","all_time","custom"]).nullable(),movement_type:z.enum(["expense","income","both"]).nullable(),limit:z.int().min(1).max(20).nullable(),scope:z.enum(["shared","personal","combined"]).nullable()}) }) }),
  z.object({ action: z.literal("request_clarification"), confidence: z.number().min(0).max(1), requires_confirmation: z.literal(true), data: z.object({ question: z.string().min(1) }) }),
  z.object({ action: z.literal("cancel_action"), confidence: z.number().min(0).max(1), requires_confirmation: z.literal(false), data: z.object({}) }),
  z.object({ action: z.literal("general_question"), confidence: z.number().min(0).max(1), requires_confirmation: z.literal(false), data: z.object({ answer: z.string().min(1) }) }),
]);

export const financialActionResponseSchema = z.object({ result: financialActionSchema });

export type FinancialAction = z.infer<typeof financialActionSchema>;
