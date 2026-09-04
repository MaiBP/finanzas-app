import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isTimingSafeEqual } from "@/lib/security/timing-safe";
import { madridDateISO } from "@/lib/date/madrid-date";
import { sendTelegramMessage } from "@/lib/telegram/api";
import { decryptField } from "@/lib/security/field-encryption";
import { buildReminderNotificationMessage, isOneTimeReminderDueToday, isRecurringReminderDueToday } from "@/services/reminders";

export const dynamic = "force-dynamic";

type ReminderRow = {
  id: string;
  household_id: string;
  created_by: string;
  description: string;
  scope: "personal" | "shared";
  is_recurring: boolean;
  day_of_month: number | null;
  reminder_date: string | null;
  remind_days_before: number;
  amount_cents: number | null;
};

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || !isTimingSafeEqual(request.headers.get("authorization"), `Bearer ${secret}`)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today = madridDateISO();
  const db = createAdminClient();
  const { data: reminders, error: remindersError } = await db.from("reminders").select("id,household_id,created_by,description,scope,is_recurring,day_of_month,reminder_date,remind_days_before,amount_cents").eq("active", true);
  if (remindersError) throw remindersError;

  let sent = 0; let skipped = 0; let failed = 0;
  for (const reminder of (reminders ?? []) as ReminderRow[]) {
    try {
      const due = reminder.is_recurring
        ? isRecurringReminderDueToday(reminder.day_of_month!, reminder.remind_days_before, today)
        : isOneTimeReminderDueToday(reminder.reminder_date!, reminder.remind_days_before, today);
      if (!due) { skipped++; continue; }

      // Shared goes to every linked member of the household; personal only to whoever created it —
      // same visibility rule as the RLS policy on this table.
      const recipientIds = reminder.scope === "shared"
        ? ((await db.from("household_members").select("user_id").eq("household_id", reminder.household_id)).data ?? []).map((row) => row.user_id as string)
        : [reminder.created_by];
      const { data: linksData } = await db.from("telegram_links").select("user_id,telegram_chat_id").in("user_id", recipientIds);
      const links = (linksData ?? []) as { user_id: string; telegram_chat_id: number }[];

      const message = buildReminderNotificationMessage(decryptField(reminder.description), reminder.amount_cents);
      for (const link of links) {
        const { error: deliveryError } = await db.from("reminder_deliveries").insert({ reminder_id: reminder.id, user_id: link.user_id, delivery_date: today });
        if (deliveryError?.code === "23505") continue; // already notified this user today
        if (deliveryError) throw deliveryError;
        await sendTelegramMessage(link.telegram_chat_id, message);
        sent++;
      }

      // A one-off reminder is done once its day passes, regardless of how many recipients actually
      // got the Telegram message — there's no meaningful "retry tomorrow" for a missed one-time date.
      if (!reminder.is_recurring) await db.from("reminders").update({ active: false }).eq("id", reminder.id);
    } catch (error) {
      console.error("reminder-notifications cron: failed for reminder", reminder.id, error);
      failed++;
    }
  }
  return NextResponse.json({ ok: failed === 0, sent, skipped, failed });
}
