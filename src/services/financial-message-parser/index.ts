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
Reglas: importes en céntimos positivos; moneda EUR; fecha ISO; nunca SQL; no inventes cuentas o categorías; usa request_clarification si falta importe o hay ambigüedad real; delete y update siempre requieren confirmación; create requiere confirmación si confidence < 0.85; gastos e ingresos son shared por defecto; usa personal únicamente cuando el usuario lo indique explícitamente y entonces privacy debe ser private; las consultas pueden combinar el espacio compartido y el personal del usuario; responde según Europe/Madrid.
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
