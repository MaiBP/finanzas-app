import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { financialActionResponseSchema, financialActionSchema, type FinancialAction } from "./schema";
import { applyFinancialDefaults } from "./defaults";

export interface ParserContext {
  text: string; userId: string; householdId: string; now: string;
  categories: { name: string; kind: string }[]; accounts: { name: string; is_shared?: boolean }[];
  recentMessages: { role: "user" | "assistant"; content: string }[];
}

export async function parseFinancialMessage(context: ParserContext): Promise<FinancialAction> {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY no está configurada");
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const system = `Eres el intérprete financiero de una app española para parejas. Devuelve una sola acción estructurada.
Reglas: importes en céntimos positivos; moneda EUR; fecha ISO; nunca SQL; no inventes cuentas o categorías; usa request_clarification si falta importe o hay ambigüedad real; delete y update siempre requieren confirmación; create requiere confirmación si confidence < 0.85; gastos e ingresos son shared por defecto; usa personal únicamente cuando el usuario lo indique explícitamente y entonces privacy debe ser private; si hay varias cuentas disponibles y el usuario no identifica una, devuelve create_transaction con account_name null para que la aplicación pregunte; conserva en account_name el nombre exacto de la cuenta elegida.
En consultas, elige siempre query_finances y la intención más específica: period_summary para ingresos/gastos/resultado de un período; category_spending para categorías; user_contributions para importes por persona; household_balance para saldo actual histórico; recent_transactions para últimos movimientos; compare_months para comparar meses; account_summary para una cuenta concreta o desglose por cuentas; largest_transactions para mayores gastos/ingresos; monthly_trend para evolución mensual. Usa spending_by_date_range cuando el usuario indique fechas explícitas. Usa filters.scope personal para finanzas privadas, combined solo cuando pidan expresamente ambos espacios y shared para hogar/compartido o cuando no especifiquen alcance. Mapea “este mes/mes corriente” a period=current_month, “este año/año corriente/acumulado anual” a period=current_year, “mes pasado” a period=last_month, “últimos 30 días” a period=last_30_days, “histórico/desde siempre” a period=all_time y rangos explícitos a period=custom con date_from/date_to. Si menciona una cuenta usa su nombre exacto en account_name. Usa movement_type para limitar a ingresos o gastos cuando corresponda. No calcules importes: solo estructura la consulta; la aplicación leerá Supabase. Responde según Europe/Madrid.
Usuario actual: ${context.userId}. Hogar: ${context.householdId}. Ahora: ${context.now}.
Categorías: ${JSON.stringify(context.categories)}. Cuentas: ${JSON.stringify(context.accounts)}.`;
  const response = await client.responses.parse({
    model: process.env.OPENAI_MODEL ?? "gpt-5.6-luna",
    reasoning: { effort: "none" },
    store: false,
    input: [
      { role: "system", content: system },
      ...context.recentMessages.slice(-6).map(message => ({ role: message.role, content: message.content })),
      { role: "user", content: context.text },
    ],
    text: { format: zodTextFormat(financialActionResponseSchema, "financial_action") },
  });
  const parsed = financialActionSchema.safeParse(response.output_parsed?.result);
  if (!parsed.success) throw new Error("La respuesta de IA no superó la validación local");
  return applyFinancialDefaults(parsed.data, context.text);
}
