import { describe, expect, it } from "vitest";
import { daysSinceTrialStart, notificationKeyForDay, buildDay20Message, buildDay27Message, buildTrialEndedMessage, buildReminderMessage } from "@/services/trial-reminders";

describe("daysSinceTrialStart", () => {
  it("returns 0 on the same day", () => {
    const start = new Date("2026-08-01T09:00:00Z");
    expect(daysSinceTrialStart(start, new Date("2026-08-01T15:00:00Z"))).toBe(0);
  });

  it("counts full elapsed days", () => {
    const start = new Date("2026-08-01T09:00:00Z");
    expect(daysSinceTrialStart(start, new Date("2026-08-21T09:00:00Z"))).toBe(20);
    expect(daysSinceTrialStart(start, new Date("2026-08-31T09:00:00Z"))).toBe(30);
  });
});

describe("notificationKeyForDay", () => {
  it("returns null when the household isn't trialing", () => {
    expect(notificationKeyForDay(20, "active")).toBeNull();
    expect(notificationKeyForDay(20, "none")).toBeNull();
    expect(notificationKeyForDay(20, "past_due")).toBeNull();
  });

  it("maps day 20 and day 27 exactly", () => {
    expect(notificationKeyForDay(20, "trialing")).toBe("day20");
    expect(notificationKeyForDay(27, "trialing")).toBe("day27");
  });

  it("maps day 30 and beyond to trial_ended", () => {
    expect(notificationKeyForDay(30, "trialing")).toBe("trial_ended");
    expect(notificationKeyForDay(45, "trialing")).toBe("trial_ended");
  });

  it("returns null for days with no scheduled reminder", () => {
    expect(notificationKeyForDay(0, "trialing")).toBeNull();
    expect(notificationKeyForDay(19, "trialing")).toBeNull();
    expect(notificationKeyForDay(21, "trialing")).toBeNull();
    expect(notificationKeyForDay(29, "trialing")).toBeNull();
  });
});

describe("reminder message builders", () => {
  it("day20 mentions the transaction count", () => {
    expect(buildDay20Message(7)).toContain("7 movimientos");
    expect(buildDay20Message(1)).toContain("1 movimiento");
    expect(buildDay20Message(1)).not.toContain("1 movimientos");
  });

  it("day27 and trial_ended have fixed copy", () => {
    expect(buildDay27Message()).toContain("3 días");
    expect(buildTrialEndedMessage()).toContain("solo lectura");
  });

  it("buildReminderMessage dispatches to the right builder", () => {
    expect(buildReminderMessage("day20", 3)).toBe(buildDay20Message(3));
    expect(buildReminderMessage("day27", 3)).toBe(buildDay27Message());
    expect(buildReminderMessage("trial_ended", 3)).toBe(buildTrialEndedMessage());
  });
});
