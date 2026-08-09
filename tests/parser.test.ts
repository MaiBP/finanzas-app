import { describe, expect, it } from "vitest";
import { financialActionResponseSchema, financialActionSchema } from "@/services/financial-message-parser/schema";
import { zodTextFormat } from "openai/helpers/zod";

describe("financial action schema",()=>{it("accepts a safe structured action",()=>{const result=financialActionSchema.safeParse({action:"create_transaction",confidence:.96,requires_confirmation:false,data:{type:"expense",amount_cents:4250,currency:"EUR",description:"Compra en Mercadona",category:"Supermercado",scope:"shared",privacy:"visible",transaction_date:"2026-08-01",paid_by:"current_user",account_name:null,split_type:"equal"}});expect(result.success).toBe(true)});it("rejects non-positive amounts and unknown actions",()=>{expect(financialActionSchema.safeParse({action:"run_sql",confidence:1,requires_confirmation:false,data:{sql:"delete"}}).success).toBe(false)});it("can be converted to an OpenAI Structured Outputs format",()=>{expect(()=>zodTextFormat(financialActionResponseSchema,"financial_action")).not.toThrow()})});

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
        user_name: null,
        account_name: null,
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
