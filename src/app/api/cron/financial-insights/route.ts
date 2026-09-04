import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendTelegramMessage, escapeTelegramHtml } from "@/lib/telegram/api";
import { getHouseholdFinancialInsight } from "@/services/financial-insights";
import { isTimingSafeEqual } from "@/lib/security/timing-safe";
import { madridDateISO } from "@/lib/date/madrid-date";

export const dynamic = "force-dynamic";

type TelegramLink = { user_id: string; telegram_chat_id: number };

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || !isTimingSafeEqual(request.headers.get("authorization"), `Bearer ${secret}`)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = createAdminClient();
  const { data: links, error: linksError } = await db.from("telegram_links").select("user_id,telegram_chat_id");
  if (linksError) throw linksError;

  const today = madridDateISO();
  const month = today.slice(0, 7);
  const insights = new Map<string, ReturnType<typeof getHouseholdFinancialInsight>>();
  let sent = 0; let skipped = 0; let failed = 0;

  for (const link of (links ?? []) as TelegramLink[]) {
    const { data: membership, error: membershipError } = await db.from("household_members").select("household_id,households(base_currency)").eq("user_id", link.user_id).maybeSingle();
    if (membershipError || !membership) { failed++; continue; }
    const baseCurrency = (membership.households as unknown as { base_currency: string } | null)?.base_currency ?? "EUR";

    if (!insights.has(membership.household_id)) insights.set(membership.household_id, getHouseholdFinancialInsight(db, membership.household_id, month, baseCurrency, today));
    let insight;
    try { insight = await insights.get(membership.household_id)!; }
    catch (error) { console.error("Financial insight analysis failed", { householdId: membership.household_id, error }); failed++; continue; }
    if (!insight.notifiable) { skipped++; continue; }

    const { data: delivery, error: deliveryError } = await db.from("financial_insight_deliveries").insert({ household_id: membership.household_id, user_id: link.user_id, insight_key: insight.key, channel: "telegram", status: "pending" }).select("id").maybeSingle();
    if (deliveryError?.code === "23505") { skipped++; continue; }
    if (deliveryError || !delivery) { failed++; continue; }

    // A proactive insight/reminder isn't a movement confirmation, so no web-app link here.
    const message = escapeTelegramHtml(`💡 Miti-Miti · ${insight.label} financiero\n\n${insight.message}\n${insight.detail}`);
    let telegramSent = false;
    try {
      await sendTelegramMessage(link.telegram_chat_id, message);
      telegramSent = true;
      const { error } = await db.from("financial_insight_deliveries").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", delivery.id);
      if (error) throw error;
      sent++;
    } catch (error) {
      console.error("Financial insight notification failed", { userId: link.user_id, error });
      if (!telegramSent) await db.from("financial_insight_deliveries").delete().eq("id", delivery.id).eq("status", "pending");
      failed++;
    }
  }

  return NextResponse.json({ ok: failed === 0, sent, skipped, failed });
}
