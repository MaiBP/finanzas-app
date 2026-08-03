import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { financialActionResponseSchema, financialActionSchema, type FinancialAction } from "./schema";

export interface ParserContext {
  text: string; userId: string; householdId: string; now: string;
  categories: { name: string; kind: string }[]; accounts: { name: string }[];
  recentMessages: { role: "user" | "assistant"; content: string }[];
}

export async function parseFinancialMessage(context: ParserContext): Promise<FinancialAction> {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY no está configurada");
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const system = `Eres el intérprete financiero de una app española para parejas. Devuelve una sola acción estructurada.
Reglas: importes en céntimos positivos; moneda EUR; fecha ISO; nunca SQL; no inventes cuentas o categorías; usa request_clarification si falta importe o hay ambigüedad real; delete y update siempre requieren confirmación; create requiere confirmación si confidence < 0.85; "nosotros" o "nos" suele ser shared; si no se indica scope usa personal; responde según Europe/Madrid.
Usuario actual: ${context.userId}. Hogar: ${context.householdId}. Ahora: ${context.now}.
Categorías: ${JSON.stringify(context.categories)}. Cuentas: ${JSON.stringify(context.accounts)}.`;
  const response = await client.responses.parse({
    model: process.env.OPENAI_MODEL ?? "gpt-5.6",
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
  return parsed.data;
}
