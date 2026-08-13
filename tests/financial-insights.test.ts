import { describe, expect, it } from "vitest";
import { analyzeFinancialBehavior, type InsightTransaction } from "@/services/financial-insights";

const transaction = (date: string, type: "expense" | "income", amount: number, description: string, category: string): InsightTransaction => ({
  transaction_date: date, type, amount_cents: amount, description, categories: { name: category },
});

describe("financial insights", () => {
  it("reminds about a recurring bill that has not been registered", () => {
    const insight = analyzeFinancialBehavior([
      transaction("2026-06-03", "expense", 90000, "Alquiler", "Vivienda"),
      transaction("2026-07-02", "expense", 90000, "Alquiler", "Vivienda"),
    ], "2026-08", "2026-08-03");
    expect(insight.label).toBe("Recordatorio");
    expect(insight.message).toContain("pagar alquiler");
    expect(insight.notifiable).toBe(true);
  });

  it("detects three consecutive months of category growth", () => {
    const insight = analyzeFinancialBehavior([
      transaction("2026-06-10", "expense", 10000, "Cena", "Restaurantes"),
      transaction("2026-07-10", "expense", 13000, "Cena", "Restaurantes"),
      transaction("2026-08-03", "expense", 17000, "Cena", "Restaurantes"),
    ], "2026-08", "2026-08-12");
    expect(insight.label).toBe("Tendencia");
    expect(insight.message).toContain("restaurantes");
  });

  it("calculates the current savings rate", () => {
    const insight = analyzeFinancialBehavior([
      transaction("2026-08-01", "income", 100000, "Nómina", "Ingresos"),
      transaction("2026-08-02", "expense", 82000, "Gastos", "Otros"),
    ], "2026-08", "2026-08-12");
    expect(insight.message).toBe("Este mes ahorraron un 18 %.");
    expect(insight.notifiable).toBe(true);
  });

  it("does not notify when there is not enough information", () => {
    expect(analyzeFinancialBehavior([], "2026-08", "2026-08-12").notifiable).toBe(false);
  });
});
