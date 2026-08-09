import { z } from "zod";

const transactionData = z.object({
  type: z.enum(["expense", "income"]), amount_cents: z.int().positive(), currency: z.literal("EUR"),
  description: z.string().min(2).max(160), category: z.string().min(1), scope: z.enum(["personal", "shared"]),
  privacy: z.enum(["visible", "private"]), transaction_date: z.iso.date(), paid_by: z.string(),
  account_name: z.string().nullable(), split_type: z.enum(["equal", "single", "percentage"]),
});

export const financialActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("create_transaction"), confidence: z.number().min(0).max(1), requires_confirmation: z.boolean(), data: transactionData }),
  z.object({ action: z.literal("update_transaction"), confidence: z.number().min(0).max(1), requires_confirmation: z.literal(true), data: z.object({ reference:z.string(),amount_cents:z.int().positive().nullable(),description:z.string().nullable(),category:z.string().nullable(),scope:z.enum(["personal","shared"]).nullable(),privacy:z.enum(["visible","private"]).nullable(),transaction_date:z.iso.date().nullable(),account_name:z.string().nullable() }) }),
  z.object({ action: z.literal("delete_transaction"), confidence: z.number().min(0).max(1), requires_confirmation: z.literal(true), data: z.object({ transaction_id: z.uuid().nullable(), reference: z.string() }) }),
  z.object({ action: z.literal("query_finances"), confidence: z.number().min(0).max(1), requires_confirmation: z.literal(false), data: z.object({ query_type: z.enum(["month_summary","period_summary","category_spending","user_contributions","household_balance","recent_transactions","compare_months","spending_by_date_range","account_summary","largest_transactions","monthly_trend"]), filters: z.object({category:z.string().nullable(),user_name:z.string().nullable(),account_name:z.string().nullable(),date_from:z.iso.date().nullable(),date_to:z.iso.date().nullable(),month:z.string().regex(/^\d{4}-\d{2}$/).nullable(),period:z.enum(["current_month","current_year","last_month","last_30_days","all_time","custom"]).nullable(),movement_type:z.enum(["expense","income","both"]).nullable(),limit:z.int().min(1).max(20).nullable(),scope:z.enum(["shared","personal","combined"]).nullable()}) }) }),
  z.object({ action: z.literal("request_clarification"), confidence: z.number().min(0).max(1), requires_confirmation: z.literal(true), data: z.object({ question: z.string().min(1) }) }),
  z.object({ action: z.literal("cancel_action"), confidence: z.number().min(0).max(1), requires_confirmation: z.literal(false), data: z.object({}) }),
]);

export const financialActionResponseSchema = z.object({ result: financialActionSchema });

export type FinancialAction = z.infer<typeof financialActionSchema>;
