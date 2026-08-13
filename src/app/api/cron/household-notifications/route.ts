import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendTelegramMessage, escapeTelegramHtml } from "@/lib/telegram/api";
import { buildDailySummaryMessage, isReminderDay, WEEKLY_REMINDER_MESSAGE, type DailyMovementRow } from "@/services/household-notifications";
import { isTimingSafeEqual } from "@/lib/security/timing-safe";
import { getHouseholdRoster } from "@/services/household-roster";

export const dynamic = "force-dynamic";

type TelegramLink = { user_id: string; telegram_chat_id: number };

function madridDate() {
  const parts = new Intl.DateTimeFormat("en", { timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || !isTimingSafeEqual(request.headers.get("authorization"), `Bearer ${secret}`)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = createAdminClient();
  const { data: linksData, error: linksError } = await db.from("telegram_links").select("user_id,telegram_chat_id");
  if (linksError) throw linksError;
  const links = (linksData ?? []) as TelegramLink[];

  const today = madridDate();
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  const householdLinks = new Map<string, TelegramLink[]>();
  for (const link of links) {
    const { data: membership, error: membershipError } = await db.from("household_members").select("household_id").eq("user_id", link.user_id).maybeSingle();
    if (membershipError || !membership) { failed++; continue; }
    householdLinks.set(membership.household_id, [...(householdLinks.get(membership.household_id) ?? []), link]);
  }

  for (const [householdId, householdMemberLinks] of householdLinks) {
    const { data: rowsData, error: rowsError } = await db
      .from("transactions")
      .select("type,amount_cents,created_by")
      .eq("household_id", householdId)
      .eq("scope", "shared")
      .eq("status", "confirmed")
      .eq("transaction_date", today);
    if (rowsError) { failed += householdMemberLinks.length; continue; }
    const rows = (rowsData ?? []) as DailyMovementRow[];

    let message: string | null = null;
    let insightKey = "";

    if (rows.length) {
      const roster = await getHouseholdRoster(db, householdId);
      const names = new Map(roster.map((member) => [member.userId, member.displayName]));
      message = buildDailySummaryMessage(rows, names);
      insightKey = `daily-summary:${today}`;
    } else if (isReminderDay(householdId, today)) {
      message = WEEKLY_REMINDER_MESSAGE;
      insightKey = `weekly-reminder:${today}`;
    }

    if (!message) { skipped += householdMemberLinks.length; continue; }

    for (const link of householdMemberLinks) {
      const { data: delivery, error: deliveryError } = await db
        .from("financial_insight_deliveries")
        .insert({ household_id: householdId, user_id: link.user_id, insight_key: insightKey, channel: "telegram", status: "pending" })
        .select("id")
        .maybeSingle();
      if (deliveryError?.code === "23505") { skipped++; continue; }
      if (deliveryError || !delivery) { failed++; continue; }

      let telegramSent = false;
      try {
        // Daily summaries and weekly reminders aren't movement confirmations, so no web-app link.
        await sendTelegramMessage(link.telegram_chat_id, escapeTelegramHtml(message));
        telegramSent = true;
        const { error } = await db.from("financial_insight_deliveries").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", delivery.id);
        if (error) throw error;
        sent++;
      } catch (error) {
        console.error("household-notifications: send failed", { userId: link.user_id, error });
        if (!telegramSent) await db.from("financial_insight_deliveries").delete().eq("id", delivery.id).eq("status", "pending");
        failed++;
      }
    }
  }

  return NextResponse.json({ ok: failed === 0, sent, skipped, failed });
}
