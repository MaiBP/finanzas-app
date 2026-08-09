"use server";

import { getCurrentHousehold } from "@/lib/household";
import { parseFinancialMessage } from "@/services/financial-message-parser";
import { executeFinanceQuery } from "@/services/query-service";
import { fetchRecentMessages, recordMessage } from "@/services/conversation-history";

export type AssistantState = { reply?: string; error?: string };

export async function askAssistant(_state: AssistantState, formData: FormData): Promise<AssistantState> {
  const text = String(formData.get("message") ?? "").trim();
  if (text.length < 2) return { error: "Escribe una pregunta un poco más concreta." };
  const { supabase, user, household } = await getCurrentHousehold();
  if (!household) return { error: "No tienes un hogar activo." };

  try {
    const [{ data: categories }, { data: accounts }, recentMessages] = await Promise.all([
      supabase.from("categories").select("name,kind").or(`household_id.eq.${household.id},household_id.is.null`),
      supabase.from("accounts").select("name,is_shared").eq("household_id", household.id).neq("type", "joint").is("archived_at", null),
      fetchRecentMessages(supabase, user.id),
    ]);
    await recordMessage(supabase, { userId: user.id, householdId: household.id, role: "user", content: text });

    const action = await parseFinancialMessage({
      text,
      userId: user.id,
      householdId: household.id,
      now: new Date().toISOString(),
      categories: categories ?? [],
      accounts: accounts ?? [],
      recentMessages,
    });

    let reply: string;
    if (action.action === "query_finances") {
      reply = await executeFinanceQuery(supabase, household.id, user.id, action.data, new Date(), { question: text, recentMessages });
    } else if (action.action === "general_question") {
      reply = action.data.answer;
    } else if (action.action === "request_clarification") {
      reply = action.data.question;
    } else {
      reply = "He entendido una acción sobre un movimiento. Por ahora, confírmala desde Movimientos o envíala al bot de Telegram.";
    }

    await recordMessage(supabase, { userId: user.id, householdId: household.id, role: "assistant", content: reply });
    return { reply };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "No se pudo consultar el asistente." };
  }
}
