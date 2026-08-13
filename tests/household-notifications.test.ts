import { describe, expect, it } from "vitest";
import { buildDailySummaryMessage, reminderDaysForWeek, isReminderDay, type DailyMovementRow } from "@/services/household-notifications";
import { formatMoney } from "@/lib/finance/money";

const movement = (type: "expense" | "income", amountCents: number, createdBy: string | null): DailyMovementRow => ({
  type, amount_cents: amountCents, created_by: createdBy,
});

describe("buildDailySummaryMessage", () => {
  it("returns null when there are no movements", () => {
    expect(buildDailySummaryMessage([], new Map())).toBeNull();
  });

  it("summarizes a single person's expense", () => {
    const message = buildDailySummaryMessage(
      [movement("expense", 400, "u1")],
      new Map([["u1", "Maira"]]),
    );
    expect(message).toContain(`gastaron ${formatMoney(400)}`);
    expect(message).toContain(`• Maira: gastó ${formatMoney(400)}`);
  });

  it("summarizes two people mixing expenses and income", () => {
    const message = buildDailySummaryMessage(
      [movement("expense", 400, "u1"), movement("expense", 1000, "u2"), movement("income", 5000, "u2")],
      new Map([["u1", "Maira"], ["u2", "Cristian"]]),
    );
    expect(message).toContain(`gastaron ${formatMoney(1400)}`);
    expect(message).toContain(`ingresaron ${formatMoney(5000)}`);
    expect(message).toContain(`• Maira: gastó ${formatMoney(400)}`);
    expect(message).toContain(`• Cristian: gastó ${formatMoney(1000)} y le ingresaron ${formatMoney(5000)}`);
  });

  it("falls back to 'Alguien' for unknown authors", () => {
    const message = buildDailySummaryMessage([movement("expense", 100, "unknown")], new Map());
    expect(message).toContain(`• Alguien: gastó ${formatMoney(100)}`);
  });

  it("labels a null author (departed member) as 'Miembro eliminado'", () => {
    const message = buildDailySummaryMessage([movement("expense", 100, null)], new Map());
    expect(message).toContain(`• Miembro eliminado: gastó ${formatMoney(100)}`);
  });
});

describe("reminderDaysForWeek", () => {
  it("always picks exactly 3 distinct weekdays", () => {
    const days = reminderDaysForWeek("household-a", "2026-08-10");
    expect(days.size).toBe(3);
    for (const day of days) expect(day).toBeGreaterThanOrEqual(0);
    for (const day of days) expect(day).toBeLessThanOrEqual(6);
  });

  it("is stable for the same household and week", () => {
    const a = reminderDaysForWeek("household-a", "2026-08-10");
    const b = reminderDaysForWeek("household-a", "2026-08-12");
    expect([...a].sort()).toEqual([...b].sort());
  });

  it("differs across households (in general)", () => {
    const a = reminderDaysForWeek("household-a", "2026-08-10");
    const b = reminderDaysForWeek("household-b", "2026-08-10");
    expect([...a].sort()).not.toEqual([...b].sort());
  });

  it("differs across weeks (in general)", () => {
    const a = reminderDaysForWeek("household-a", "2026-08-10");
    const b = reminderDaysForWeek("household-a", "2026-08-17");
    expect([...a].sort()).not.toEqual([...b].sort());
  });
});

describe("isReminderDay", () => {
  it("agrees with reminderDaysForWeek for every day of the week", () => {
    const week = ["2026-08-10", "2026-08-11", "2026-08-12", "2026-08-13", "2026-08-14", "2026-08-15", "2026-08-16"];
    const days = reminderDaysForWeek("household-a", week[0]);
    week.forEach((dateISO, index) => {
      expect(isReminderDay("household-a", dateISO)).toBe(days.has(index));
    });
  });
});
