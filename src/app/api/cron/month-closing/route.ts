import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isTimingSafeEqual } from "@/lib/security/timing-safe";
import { madridDateISO } from "@/lib/date/madrid-date";
import { buildMonthClosingSnapshot, isLastDayOfMonth, type SnapshotAccount, type SnapshotMovement } from "@/services/month-closing";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || !isTimingSafeEqual(request.headers.get("authorization"), `Bearer ${secret}`)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today = madridDateISO();
  if (!isLastDayOfMonth(today)) return NextResponse.json({ skipped: "not month-end", today });

  const db = createAdminClient();
  const { data: households, error: householdsError } = await db.from("households").select("id,base_currency");
  if (householdsError) throw householdsError;

  let created = 0;
  const failures: string[] = [];
  for (const household of households ?? []) {
    try {
      const [{ data: accountsData, error: accountsError }, { data: movementsData, error: movementsError }] = await Promise.all([
        db.from("accounts").select("id,name,type,currency").eq("household_id", household.id).eq("is_shared", true).neq("type", "joint").is("archived_at", null).order("created_at"),
        db.from("transactions").select("account_id,type,amount_cents").eq("household_id", household.id).eq("scope", "shared").eq("status", "confirmed").lte("transaction_date", today),
      ]);
      if (accountsError) throw accountsError;
      if (movementsError) throw movementsError;
      const accounts = (accountsData ?? []) as SnapshotAccount[];
      const movements = (movementsData ?? []) as SnapshotMovement[];
      const { totalBalanceCents, breakdown } = buildMonthClosingSnapshot(accounts, movements, household.base_currency);
      const { error: upsertError } = await db.from("month_closing_snapshots").upsert(
        { household_id: household.id, closing_date: today, base_currency: household.base_currency, total_balance_cents: totalBalanceCents, account_breakdown: breakdown },
        { onConflict: "household_id,closing_date" },
      );
      if (upsertError) throw upsertError;
      created++;
    } catch (error) {
      console.error("month-closing cron: failed for household", household.id, error);
      failures.push(household.id);
    }
  }
  return NextResponse.json({ ok: failures.length === 0, created, failed: failures.length });
}
