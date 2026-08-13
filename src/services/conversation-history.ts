import { decryptField, encryptField } from "@/lib/security/field-encryption";

export type ConversationRole = "user" | "assistant";

export interface ConversationMessage {
  role: ConversationRole;
  content: string;
}

interface DbClient {
  from: (table: string) => ReturnType<import("@supabase/supabase-js").SupabaseClient["from"]>;
}

export async function fetchRecentMessages(
  db: DbClient,
  userId: string,
  limit = 6,
): Promise<ConversationMessage[]> {
  const { data } = await db
    .from("conversation_messages")
    .select("role,content")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return ((data ?? []) as ConversationMessage[]).reverse().map((message) => ({ ...message, content: decryptField(message.content) }));
}

export async function recordMessage(
  db: DbClient,
  params: { userId: string; householdId: string; role: ConversationRole; content: string },
) {
  await db.from("conversation_messages").insert({
    user_id: params.userId,
    household_id: params.householdId,
    role: params.role,
    content: encryptField(params.content),
  });
}
