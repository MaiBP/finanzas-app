"use server";

import { getCurrentHousehold } from "@/lib/household";
import { parseFinancialMessage } from "@/services/financial-message-parser";
import { executeFinanceQuery } from "@/services/query-service";
import { fetchRecentMessages, recordMessage } from "@/services/conversation-history";
import { redactHouseholdNames, redactRecentMessages, HOUSEHOLD_NAME_PRIVACY_NOTE, type HouseholdMember } from "@/services/privacy/redact-household-names";
import { decryptField } from "@/lib/security/field-encryption";

export type AssistantState = { reply?: string; error?: string };

export async function askAssistant(_state: AssistantState, formData: FormData): Promise<AssistantState> {
  const text = String(formData.get("message") ?? "").trim();
  if (text.length < 2) return { error: "Escribe una pregunta un poco más concreta." };
  const { supabase, user, household } = await getCurrentHousehold();
  if (!household) return { error: "No tienes un hogar activo." };

  try {
    const [{ data: categories }, { data: accounts }, recentMessages, { data: membersData }] = await Promise.all([
      supabase.from("categories").select("name,kind").or(`household_id.eq.${household.id},household_id.is.null`),
      supabase.from("accounts").select("name,is_shared").eq("household_id", household.id).neq("type", "joint").is("archived_at", null),
      fetchRecentMessages(supabase, user.id),
      supabase.from("household_members").select("user_id,profiles(display_name)").eq("household_id", household.id),
    ]);
    await recordMessage(supabase, { userId: user.id, householdId: household.id, role: "user", content: text });

    const roster = ((membersData ?? []) as unknown as { user_id: string; profiles: { display_name: string | null } | null }[]).map(
      (member): HouseholdMember => ({ userId: member.user_id, displayName: member.profiles?.display_name ? decryptField(member.profiles.display_name) : null }),
    );
    const { text: safeText, mentioned: textMentioned } = redactHouseholdNames(text, roster, user.id);
    const { messages: safeRecentMessages, mentioned: historyMentioned } = redactRecentMessages(recentMessages, roster, user.id);
    const mentioned = textMentioned || historyMentioned;

    const action = await parseFinancialMessage({
      text: safeText,
      userId: user.id,
      householdId: household.id,
      now: new Date().toISOString(),
      categories: categories ?? [],
      accounts: accounts ?? [],
      recentMessages: safeRecentMessages,
    });

    let reply: string;
    if (action.action === "query_finances") {
      reply = await executeFinanceQuery(supabase, household.id, user.id, action.data, new Date(), { question: safeText, recentMessages: safeRecentMessages });
    } else if (action.action === "general_question") {
      reply = action.data.answer;
    } else if (action.action === "request_clarification") {
      reply = action.data.question;
    } else {
      reply = "He entendido una acción sobre un movimiento. Por ahora, confírmala desde Movimientos o envíasela a Finzy por Telegram.";
    }
    if (mentioned) reply = `${reply}\n\n${HOUSEHOLD_NAME_PRIVACY_NOTE}`;

    await recordMessage(supabase, { userId: user.id, householdId: household.id, role: "assistant", content: reply });
    return { reply };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "No se pudo consultar el asistente." };
  }
}
