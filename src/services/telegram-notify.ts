import { createAdminClient } from "@/lib/supabase/admin";
import { sendTelegramMessage, escapeTelegramHtml } from "@/lib/telegram/api";

type MemberRow = { user_id: string };
type LinkRow = { user_id: string; telegram_chat_id: number };

/**
 * Best-effort proactive notification to every OTHER linked member of a household.
 * Uses the admin client because telegram_links can only be read by its own owner under RLS.
 * Never throws — a Telegram failure must not roll back or surface as an error on the
 * mutation that already succeeded (creating an account, adjusting a balance, etc).
 */
export async function notifyOtherMembers(householdId: string, excludeUserId: string, message: string): Promise<void> {
  try {
    const db = createAdminClient();
    const { data: membersData } = await db.from("household_members").select("user_id").eq("household_id", householdId).neq("user_id", excludeUserId);
    const members = (membersData ?? []) as MemberRow[];
    if (!members.length) return;

    const { data: linksData } = await db.from("telegram_links").select("user_id,telegram_chat_id").in("user_id", members.map((member) => member.user_id));
    const links = (linksData ?? []) as LinkRow[];

    // Account creation/balance adjustments aren't "movimientos" (transactions) — only those get
    // the web-app link, so this stays a plain escaped message.
    const text = escapeTelegramHtml(message);
    await Promise.all(links.map((link) => sendTelegramMessage(link.telegram_chat_id, text).catch((error) => {
      console.error("notifyOtherMembers: failed to send", { userId: link.user_id, error });
    })));
  } catch (error) {
    console.error("notifyOtherMembers failed", { householdId, error });
  }
}
