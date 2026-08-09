import { loadEnvConfig } from "@next/env";
import { describe, expect, it } from "vitest";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseFinancialMessage } from "@/services/financial-message-parser";
import { executeFinanceQuery } from "@/services/query-service";

loadEnvConfig(process.cwd());
const live = process.env.RUN_OPENAI_LIVE === "1";

describe.skipIf(!live)("financial assistant with OpenAI and Supabase", () => {
  it("answers the accumulated income and expenses for the current year", async () => {
    const db = createAdminClient();
    const { data: link } = await db.from("telegram_links").select("user_id").limit(1).single();
    expect(link).toBeTruthy();
    const { data: membership } = await db
      .from("household_members")
      .select("household_id")
      .eq("user_id", link!.user_id)
      .single();
    expect(membership).toBeTruthy();
    const [{ data: categories }, { data: accounts }] = await Promise.all([
      db.from("categories").select("name,kind").or(`household_id.eq.${membership!.household_id},household_id.is.null`),
      db.from("accounts").select("name,is_shared").eq("household_id", membership!.household_id).is("archived_at", null),
    ]);
    const action = await parseFinancialMessage({
      text: "¿Cuánto es el acumulado del corriente año en ingresos y gastos?",
      userId: link!.user_id,
      householdId: membership!.household_id,
      now: "2026-08-06T10:00:00+02:00",
      categories: categories ?? [],
      accounts: accounts ?? [],
      recentMessages: [],
    });
    expect(action.action).toBe("query_finances");
    if (action.action !== "query_finances") return;
    expect(action.data.query_type).toBe("period_summary");
    expect(action.data.filters.period).toBe("current_year");
    expect(action.data.filters.scope).toBe("shared");
    const reply = await executeFinanceQuery(
      db,
      membership!.household_id,
      link!.user_id,
      action.data,
      new Date("2026-08-06T08:00:00Z"),
    );
    expect(reply).toContain("ingresos");
    expect(reply).toContain("gastos");
    expect(reply).toContain("2026 hasta hoy");
  }, 60_000);
});
