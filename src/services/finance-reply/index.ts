import OpenAI from "openai";
import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import type { ConversationMessage } from "@/services/conversation-history";

const financeReplySchema = z.object({ reply: z.string().min(1) });

const SYSTEM_PROMPT = `Sos un asistente financiero cercano y claro para una app española de parejas. Te paso datos YA CALCULADOS a partir de la base de datos real, con los importes ya formateados en euros (por ejemplo "20.433,14 €"): nunca inventes, cambies, recalcules ni reformatees esas cifras, cópialas tal cual están escritas dentro de una redacción natural y breve (máximo 4-5 líneas). Si los datos incluyen una comparación entre períodos o una tendencia, podés hacer una observación breve al respecto. No des consejos de inversión ni menciones productos, bancos o entidades concretas.`;

export async function phraseFinanceReply(
  facts: unknown,
  question: string,
  recentMessages: ConversationMessage[] = [],
): Promise<string> {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY no está configurada");
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.responses.parse({
    model: process.env.OPENAI_MODEL ?? "gpt-5.6-luna",
    reasoning: { effort: "none" },
    store: false,
    input: [
      { role: "system", content: SYSTEM_PROMPT },
      ...recentMessages.slice(-4).map((message) => ({ role: message.role, content: message.content })),
      {
        role: "user",
        content: `Pregunta original: ${question}\nDatos calculados (JSON, son correctos y definitivos): ${JSON.stringify(facts)}`,
      },
    ],
    text: { format: zodTextFormat(financeReplySchema, "finance_reply") },
  });
  const parsed = financeReplySchema.safeParse(response.output_parsed);
  if (!parsed.success) throw new Error("La redacción de IA no superó la validación local");
  return parsed.data.reply;
}
