import { describe, expect, it } from "vitest";
import { buildReminderNotificationMessage, describeReminderCreated, describeReminderList, describeReminderPreview, findReminderByReference, isOneTimeReminderDueToday, isRecurringReminderDueToday, nextRecurringOccurrence, type ReminderRecord } from "@/services/reminders";

const reminders: ReminderRecord[] = [
  { id: "1", description: "Pagar el alquiler", scope: "shared", is_recurring: true, day_of_month: 5, reminder_date: null, remind_days_before: 0, amount_cents: 90000 },
  { id: "2", description: "Se descuenta la luz", scope: "shared", is_recurring: true, day_of_month: 10, reminder_date: null, remind_days_before: 2, amount_cents: null },
  { id: "3", description: "Renovar el DNI", scope: "personal", is_recurring: false, day_of_month: null, reminder_date: "2026-11-01", remind_days_before: 0, amount_cents: null },
];

describe("isRecurringReminderDueToday", () => {
  it("fires on the exact day of month with no advance notice", () => {
    expect(isRecurringReminderDueToday(5, 0, "2026-09-05")).toBe(true);
    expect(isRecurringReminderDueToday(5, 0, "2026-09-04")).toBe(false);
    expect(isRecurringReminderDueToday(5, 0, "2026-09-06")).toBe(false);
  });

  it("fires N days before the day of month when advance notice is set", () => {
    expect(isRecurringReminderDueToday(10, 2, "2026-09-08")).toBe(true);
    expect(isRecurringReminderDueToday(10, 2, "2026-09-10")).toBe(false);
  });

  it("clamps a day-of-month past the end of a shorter month (e.g. 31 in September)", () => {
    expect(isRecurringReminderDueToday(31, 0, "2026-09-30")).toBe(true);
  });

  it("crosses into the previous month when advance notice pushes past day 1", () => {
    // day_of_month=1, notify 3 days before → fires on Aug 29 for the Sep 1 occurrence.
    expect(isRecurringReminderDueToday(1, 3, "2026-08-29")).toBe(true);
    expect(isRecurringReminderDueToday(1, 3, "2026-08-28")).toBe(false);
  });
});

describe("isOneTimeReminderDueToday", () => {
  it("fires on the exact date with no advance notice", () => {
    expect(isOneTimeReminderDueToday("2026-12-24", 0, "2026-12-24")).toBe(true);
    expect(isOneTimeReminderDueToday("2026-12-24", 0, "2026-12-23")).toBe(false);
  });

  it("fires N days before the date, crossing a month boundary", () => {
    expect(isOneTimeReminderDueToday("2026-10-02", 3, "2026-09-29")).toBe(true);
  });
});

describe("nextRecurringOccurrence", () => {
  it("returns this month's date when the day hasn't passed yet", () => {
    expect(nextRecurringOccurrence(20, "2026-09-05")).toBe("2026-09-20");
  });

  it("rolls over to next month once the day has passed", () => {
    expect(nextRecurringOccurrence(5, "2026-09-10")).toBe("2026-10-05");
  });

  it("clamps into a shorter month and rolls to December→January correctly", () => {
    expect(nextRecurringOccurrence(31, "2026-04-15")).toBe("2026-04-30");
    expect(nextRecurringOccurrence(31, "2026-12-31")).toBe("2026-12-31");
    expect(nextRecurringOccurrence(31, "2027-01-01")).toBe("2027-01-31");
  });
});

describe("describeReminderCreated", () => {
  it("describes a recurring shared reminder with an amount and advance notice", () => {
    const text = describeReminderCreated({
      description: "Pagar el alquiler", scope: "shared", is_recurring: true,
      day_of_month: 5, reminder_date: null, remind_days_before: 2, amount_cents: 90000,
    });
    expect(text).toContain("Pagar el alquiler");
    expect(text).toContain("todos los meses el día 5");
    expect(text).toContain("2 días antes");
    expect(text).toContain("compartido");
  });

  it("describes a one-off personal reminder without an amount", () => {
    const text = describeReminderCreated({
      description: "Renovar el DNI", scope: "personal", is_recurring: false,
      day_of_month: null, reminder_date: "2026-11-01", remind_days_before: 0, amount_cents: null,
    });
    expect(text).toContain("el 2026-11-01");
    expect(text).toContain("personal");
    expect(text).not.toContain("días antes");
  });
});

describe("describeReminderPreview", () => {
  it("uses neutral 'identified' phrasing, not a completion message", () => {
    const text = describeReminderPreview({
      description: "Pagar el alquiler", scope: "shared", is_recurring: true,
      day_of_month: 5, reminder_date: null, remind_days_before: 0, amount_cents: null,
    });
    expect(text).toContain("Identifiqué un recordatorio");
    expect(text).not.toContain("Listo");
  });
});

describe("findReminderByReference", () => {
  it("matches an exact description", () => {
    expect(findReminderByReference(reminders, "Renovar el DNI")?.id).toBe("3");
  });

  it("matches a partial mention (accent/case-insensitive)", () => {
    expect(findReminderByReference(reminders, "alquiler")?.id).toBe("1");
    expect(findReminderByReference(reminders, "LUZ")?.id).toBe("2");
  });

  it("returns undefined when nothing matches or the reference is ambiguous", () => {
    expect(findReminderByReference(reminders, "internet")).toBeUndefined();
    expect(findReminderByReference(reminders, "e")).toBeUndefined();
  });
});

describe("describeReminderList", () => {
  it("lists every reminder with its amount and timing", () => {
    const text = describeReminderList(reminders);
    expect(text).toContain("Pagar el alquiler");
    expect(text).toContain("Se descuenta la luz");
    expect(text).toContain("Renovar el DNI");
  });

  it("says there are none when the list is empty", () => {
    expect(describeReminderList([])).toContain("No tenés recordatorios");
  });
});

describe("buildReminderNotificationMessage", () => {
  it("includes the amount when present", () => {
    expect(buildReminderNotificationMessage("Pagar el alquiler", 90000)).toContain("90");
  });

  it("omits the amount note when absent", () => {
    expect(buildReminderNotificationMessage("Pagar el alquiler", null)).toBe("🔔 Recordatorio: Pagar el alquiler");
  });
});
