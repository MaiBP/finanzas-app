import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendTelegramMessage, escapeTelegramHtml } from "@/lib/telegram/api";
import { sendEmail } from "@/lib/email/send";
import { day20EmailHtml, day27EmailHtml, trialEndedEmailHtml } from "@/lib/email/templates/trial-reminder";
import { isTimingSafeEqual } from "@/lib/security/timing-safe";
import { getHouseholdRoster } from "@/services/household-roster";
import { daysSinceTrialStart, notificationKeyForDay, buildReminderMessage, type NotificationKey } from "@/services/trial-reminders";

export const dynamic = "force-dynamic";

type Household = { id: string; trial_started_at: string; subscription_status: string };
type Channel = "in_app" | "telegram" | "email";

function emailHtmlFor(key: NotificationKey, transactionCount: number): string {
  if (key === "day20") return day20EmailHtml(transactionCount);
  if (key === "day27") return day27EmailHtml();
  return trialEndedEmailHtml();
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || !isTimingSafeEqual(request.headers.get("authorization"), `Bearer ${secret}`)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = createAdminClient();
  const now = new Date();

  const { data: householdsData, error: householdsError } = await db
    .from("households")
    .select("id,trial_started_at,subscription_status")
    .eq("subscription_status", "trialing")
    .not("trial_started_at", "is", null);
  if (householdsError) throw householdsError;
  const households = (householdsData ?? []) as Household[];

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const household of households) {
    const key = notificationKeyForDay(daysSinceTrialStart(new Date(household.trial_started_at), now), household.subscription_status);
    if (!key) { skipped++; continue; }

    let transactionCount = 0;
    if (key === "day20") {
      const { count } = await db.from("transactions").select("id", { count: "exact", head: true }).eq("household_id", household.id).eq("status", "confirmed");
      transactionCount = count ?? 0;
    }

    const message = buildReminderMessage(key, transactionCount);
    const roster = await getHouseholdRoster(db, household.id);
    const { data: linksData } = await db.from("telegram_links").select("user_id,telegram_chat_id").in("user_id", roster.map((member) => member.userId));
    const telegramByUser = new Map((linksData ?? []).map((link) => [link.user_id as string, link.telegram_chat_id as number]));

    for (const member of roster) {
      const channels: Channel[] = ["in_app"];
      if (telegramByUser.has(member.userId)) channels.push("telegram");
      if (process.env.RESEND_API_KEY) channels.push("email");

      for (const channel of channels) {
        const { data: delivery, error: deliveryError } = await db
          .from("trial_notification_deliveries")
          .insert({ household_id: household.id, user_id: member.userId, notification_key: key, channel, status: "pending" })
          .select("id")
          .maybeSingle();
        if (deliveryError?.code === "23505") { skipped++; continue; }
        if (deliveryError || !delivery) { failed++; continue; }

        try {
          if (channel === "in_app") {
            // Nothing to transmit — the row itself IS the notification; the dashboard banner reads
            // trial_notification_deliveries rows with channel='in_app', status='sent', seen_at null.
          } else if (channel === "telegram") {
            await sendTelegramMessage(telegramByUser.get(member.userId)!, escapeTelegramHtml(message));
          } else {
            const { data: authUser } = await db.auth.admin.getUserById(member.userId);
            const email = authUser?.user?.email;
            if (!email) throw new Error("Sin email");
            const result = await sendEmail({ to: email, subject: "Tu prueba de Miti-Miti", html: emailHtmlFor(key, transactionCount) });
            if (!result.skipped && result.error) throw new Error(result.error);
          }
          const { error } = await db.from("trial_notification_deliveries").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", delivery.id);
          if (error) throw error;
          sent++;
        } catch (error) {
          console.error("trial-reminders: send failed", { userId: member.userId, channel, error });
          await db.from("trial_notification_deliveries").delete().eq("id", delivery.id).eq("status", "pending");
          failed++;
        }
      }
    }
  }

  return NextResponse.json({ ok: failed === 0, sent, skipped, failed });
}
