import { describe, expect, it } from "vitest";
import { financialActionResponseSchema, financialActionSchema } from "@/services/financial-message-parser/schema";
import { zodTextFormat } from "openai/helpers/zod";

describe("financial action schema",()=>{it("accepts a safe structured action",()=>{const result=financialActionSchema.safeParse({action:"create_transaction",confidence:.96,requires_confirmation:false,data:{type:"expense",amount_cents:4250,currency:"EUR",description:"Compra en Mercadona",category:"Supermercado",scope:"shared",privacy:"visible",transaction_date:"2026-08-01",paid_by:"current_user",account_name:null,split_type:"equal"}});expect(result.success).toBe(true);expect(result.success&&result.data.action==="create_transaction"&&result.data.data.wants_new_account).toBe(false)});it("accepts an explicit wants_new_account flag",()=>{const result=financialActionSchema.safeParse({action:"create_transaction",confidence:.9,requires_confirmation:true,data:{type:"income",amount_cents:100000,currency:"EUR",description:"Alta cuenta BBVA",category:"Nómina",scope:"shared",privacy:"visible",transaction_date:"2026-08-01",paid_by:"current_user",account_name:null,split_type:"equal",wants_new_account:true}});expect(result.success).toBe(true);expect(result.success&&result.data.action==="create_transaction"&&result.data.data.wants_new_account).toBe(true)});it("rejects non-positive amounts and unknown actions",()=>{expect(financialActionSchema.safeParse({action:"run_sql",confidence:1,requires_confirmation:false,data:{sql:"delete"}}).success).toBe(false)});it("can be converted to an OpenAI Structured Outputs format",()=>{expect(()=>zodTextFormat(financialActionResponseSchema,"financial_action")).not.toThrow()})});

it("accepts a create_transaction with an itemized breakdown", () => {
  const result = financialActionSchema.safeParse({
    action: "create_transaction", confidence: 0.95, requires_confirmation: false,
    data: {
      type: "expense", amount_cents: 5000, currency: "EUR", description: "Súper", category: "Supermercado",
      scope: "shared", privacy: "visible", transaction_date: "2026-08-02", paid_by: "current_user",
      account_name: null, split_type: "equal",
      items: [
        { description: "Pollo", amount_cents: 2500, subcategory: "Carnes y pescado" },
        { description: "Bistec de ternera", amount_cents: 2500, subcategory: "Carnes y pescado" },
      ],
    },
  });
  expect(result.success).toBe(true);
});

it("accepts a general financial-education question", () => {
  expect(financialActionSchema.safeParse({
    action: "general_question",
    confidence: 0.95,
    requires_confirmation: false,
    data: { answer: "Un fondo de emergencia cubre 3 a 6 meses de gastos y conviene tenerlo en una cuenta accesible." },
  }).success).toBe(true);
});

it("accepts an annual accumulated finance query", () => {
  expect(financialActionSchema.safeParse({
    action: "query_finances",
    confidence: 0.98,
    requires_confirmation: false,
    data: {
      query_type: "period_summary",
      filters: {
        category: null,
        subcategory: null,
        user_name: null,
        account_name: null,
        search_text: null,
        ratio_category_a: null,
        ratio_category_b: null,
        date_from: null,
        date_to: null,
        month: null,
        period: "current_year",
        movement_type: "both",
        limit: null,
        scope: "shared",
      },
    },
  }).success).toBe(true);
});

it("accepts a merchant search query", () => {
  expect(financialActionSchema.safeParse({
    action: "query_finances",
    confidence: 0.95,
    requires_confirmation: false,
    data: {
      query_type: "period_summary",
      filters: {
        category: null,
        subcategory: null,
        user_name: null,
        account_name: null,
        search_text: "Amazon",
        ratio_category_a: null,
        ratio_category_b: null,
        date_from: null,
        date_to: null,
        month: null,
        period: "current_year",
        movement_type: "expense",
        limit: null,
        scope: "shared",
      },
    },
  }).success).toBe(true);
});

it("accepts an average_daily_spend and a spending_ratio query", () => {
  const baseData = {
    category: null,
    subcategory: null,
    user_name: null,
    account_name: null,
    search_text: null,
    ratio_category_a: null,
    ratio_category_b: null,
    date_from: null,
    date_to: null,
    month: null,
    period: "current_month" as const,
    movement_type: "both" as const,
    limit: null,
    scope: "shared" as const,
  };
  expect(financialActionSchema.safeParse({
    action: "query_finances", confidence: 0.9, requires_confirmation: false,
    data: { query_type: "average_daily_spend", filters: baseData },
  }).success).toBe(true);
  expect(financialActionSchema.safeParse({
    action: "query_finances", confidence: 0.9, requires_confirmation: false,
    data: { query_type: "spending_ratio", filters: { ...baseData, ratio_category_a: "Alquiler", ratio_category_b: "Restaurantes" } },
  }).success).toBe(true);
});
