import { encryptField } from "@/lib/security/field-encryption";
import { formatMoney } from "@/lib/finance/money";

export type ReminderInput = {
  description: string;
  scope: "personal" | "shared";
  is_recurring: boolean;
  day_of_month: number | null;
  reminder_date: string | null;
  remind_days_before: number;
  amount_cents: number | null;
};

interface DbClient {
  from: (table: string) => ReturnType<import("@supabase/supabase-js").SupabaseClient["from"]>;
}

export type ReminderRecord = ReminderInput & { id: string };

export type ReminderPatch = {
  description: string | null;
  day_of_month: number | null;
  reminder_date: string | null;
  remind_days_before: number | null;
  amount_cents: number | null;
};

// Chat asks to update/delete "the alquiler reminder" by name, not by id — description is
// encrypted at rest so this can't ilike-match in SQL, same reason delete_transaction matches in JS.
function normalize(value: string) {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLocaleLowerCase("es").trim();
}

export function findReminderByReference(reminders: ReminderRecord[], reference: string): ReminderRecord | undefined {
  const target = normalize(reference);
  const exact = reminders.find((reminder) => normalize(reminder.description) === target);
  if (exact) return exact;
  const matches = reminders.filter((reminder) => normalize(reminder.description).includes(target) || target.includes(normalize(reminder.description)));
  return matches.length === 1 ? matches[0] : undefined;
}

export const MAX_ACTIVE_REMINDERS = 10;

function reminderWhenPhrase(input: ReminderInput): string {
  const noticeNote = input.remind_days_before > 0
    ? `, ${input.remind_days_before} ${input.remind_days_before === 1 ? "día" : "días"} antes`
    : "";
  return input.is_recurring
    ? `todos los meses el día ${input.day_of_month}${noticeNote}`
    : `el ${input.reminder_date}${noticeNote}`;
}

// Shown before saving anything, so the user can catch a misread day/amount before confirming —
// same idea as create_transaction's describeCreateTransaction. Neutral "identified" phrasing, not
// a completion message, since nothing is saved yet at this point.
export function describeReminderPreview(input: ReminderInput): string {
  const amountNote = input.amount_cents != null ? ` (~${formatMoney(input.amount_cents)})` : "";
  const scopeWord = input.scope === "shared" ? "compartido" : "personal";
  return `🔔 Identifiqué un recordatorio ${scopeWord}: "${input.description}"${amountNote}, ${reminderWhenPhrase(input)}.`;
}

// The reader-facing confirmation once it's actually saved, shared by Telegram and the web
// assistant so the two channels never describe the same reminder differently.
export function describeReminderCreated(input: ReminderInput): string {
  const amountNote = input.amount_cents != null ? ` (~${formatMoney(input.amount_cents)})` : "";
  const scopeWord = input.scope === "shared" ? "compartido" : "personal";
  return `🔔 Listo, te voy a recordar "${input.description}"${amountNote} ${reminderWhenPhrase(input)} (recordatorio ${scopeWord}).`;
}

export async function createReminder(db: DbClient, userId: string, householdId: string, input: ReminderInput): Promise<string> {
  const { count } = await db.from("reminders").select("*", { count: "exact", head: true }).eq("household_id", householdId).eq("active", true);
  if ((count ?? 0) >= MAX_ACTIVE_REMINDERS) {
    return `🔔 Ya tenés el máximo de ${MAX_ACTIVE_REMINDERS} recordatorios activos. Borrá alguno antes de agregar uno nuevo — pedime "¿qué recordatorios tengo?" o entrá a Recordatorios en la web.`;
  }
  const { error } = await db.from("reminders").insert({
    household_id: householdId,
    created_by: userId,
    description: encryptField(input.description),
    scope: input.scope,
    is_recurring: input.is_recurring,
    day_of_month: input.day_of_month,
    reminder_date: input.reminder_date,
    remind_days_before: input.remind_days_before,
    amount_cents: input.amount_cents,
  });
  if (error) throw new Error(error.message);
  return describeReminderCreated(input);
}

// Day 0 of the month after `month` (1-indexed) is the last day of `month` itself — same trick used
// in query-service's monthEnd and month-closing's lastDayOfMonth.
function lastDayOfMonth(month: number, year: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

// Checks both this month's and next month's occurrence of day_of_month: a large remind_days_before
// on an early day-of-month (e.g. day 1, notify 3 days before) pushes the notify-date into the
// previous month relative to the occurrence, which from "today"'s standpoint means the occurrence
// itself falls in next month — a same-month-only check would silently miss that case.
export function isRecurringReminderDueToday(dayOfMonth: number, remindDaysBefore: number, todayISO: string): boolean {
  const [year, month] = todayISO.split("-").map(Number);
  for (const monthOffset of [0, 1]) {
    const occurrenceMonthIndex = month - 1 + monthOffset; // 0-based
    const occurrenceYear = year + Math.floor(occurrenceMonthIndex / 12);
    const occurrenceMonth0 = ((occurrenceMonthIndex % 12) + 12) % 12;
    const daysInOccurrenceMonth = lastDayOfMonth(occurrenceMonth0 + 1, occurrenceYear);
    const occurrenceDay = Math.min(dayOfMonth, daysInOccurrenceMonth);
    const occurrence = new Date(Date.UTC(occurrenceYear, occurrenceMonth0, occurrenceDay));
    occurrence.setUTCDate(occurrence.getUTCDate() - remindDaysBefore);
    if (occurrence.toISOString().slice(0, 10) === todayISO) return true;
  }
  return false;
}

export function isOneTimeReminderDueToday(reminderDateISO: string, remindDaysBefore: number, todayISO: string): boolean {
  const target = new Date(`${reminderDateISO}T00:00:00Z`);
  target.setUTCDate(target.getUTCDate() - remindDaysBefore);
  return target.toISOString().slice(0, 10) === todayISO;
}

export function buildReminderNotificationMessage(description: string, amountCents: number | null): string {
  const amountNote = amountCents != null ? ` (~${formatMoney(amountCents)})` : "";
  return `🔔 Recordatorio: ${description}${amountNote}`;
}

export function describeReminderList(reminders: ReminderRecord[]): string {
  if (!reminders.length) return "🔔 No tenés recordatorios activos.";
  const lines = reminders.map((reminder) => {
    const amountNote = reminder.amount_cents != null ? ` (~${formatMoney(reminder.amount_cents)})` : "";
    return `• "${reminder.description}"${amountNote} — ${reminderWhenPhrase(reminder)}`;
  });
  return `🔔 Tus recordatorios activos:\n${lines.join("\n")}`;
}

// Only the date field matching this reminder's own fixed type ever applies — an update can never
// flip a recurring reminder into a one-off or vice versa (that's a delete + recreate). Shared by
// the actual update and its pre-confirmation preview, so the two can never disagree.
function mergeReminderPatch(reminder: ReminderRecord, patch: ReminderPatch): ReminderRecord {
  return {
    ...reminder,
    description: patch.description ?? reminder.description,
    day_of_month: reminder.is_recurring ? (patch.day_of_month ?? reminder.day_of_month) : reminder.day_of_month,
    reminder_date: !reminder.is_recurring ? (patch.reminder_date ?? reminder.reminder_date) : reminder.reminder_date,
    remind_days_before: patch.remind_days_before ?? reminder.remind_days_before,
    amount_cents: patch.amount_cents ?? reminder.amount_cents,
  };
}

// Shown before confirming a chat-triggered update/delete, so the user can see exactly which
// reminder Piggy matched before saying "sí" — matching it wrong and only finding out afterward
// would be a much worse surprise than asking again.
export function describeReminderUpdatePreview(reminder: ReminderRecord, patch: ReminderPatch): string {
  const merged = mergeReminderPatch(reminder, patch);
  const amountNote = merged.amount_cents != null ? ` (~${formatMoney(merged.amount_cents)})` : "";
  return `✏️ Encontré "${reminder.description}". Lo voy a actualizar a "${merged.description}"${amountNote}, ${reminderWhenPhrase(merged)}. ¿Confirmás?`;
}

export function describeReminderDeletePreview(reminder: ReminderRecord): string {
  const amountNote = reminder.amount_cents != null ? ` (~${formatMoney(reminder.amount_cents)})` : "";
  return `🗑️ Encontré este recordatorio: "${reminder.description}"${amountNote}, ${reminderWhenPhrase(reminder)}. ¿Confirmás eliminarlo?`;
}

export async function updateReminder(db: DbClient, reminder: ReminderRecord, patch: ReminderPatch): Promise<string> {
  const merged = mergeReminderPatch(reminder, patch);
  const unchanged = merged.description === reminder.description && merged.day_of_month === reminder.day_of_month
    && merged.reminder_date === reminder.reminder_date && merged.remind_days_before === reminder.remind_days_before
    && merged.amount_cents === reminder.amount_cents;
  if (unchanged) return `🔔 No detecté ningún cambio para "${reminder.description}".`;
  const { error } = await db.from("reminders").update({
    description: encryptField(merged.description),
    day_of_month: merged.day_of_month,
    reminder_date: merged.reminder_date,
    remind_days_before: merged.remind_days_before,
    amount_cents: merged.amount_cents,
  }).eq("id", reminder.id);
  if (error) throw new Error(error.message);
  const amountNote = merged.amount_cents != null ? ` (~${formatMoney(merged.amount_cents)})` : "";
  return `🔔 Listo, actualicé "${merged.description}"${amountNote}: ahora es ${reminderWhenPhrase(merged)}.`;
}

export async function deleteReminderRecord(db: DbClient, reminder: ReminderRecord): Promise<string> {
  const { error } = await db.from("reminders").delete().eq("id", reminder.id);
  if (error) throw new Error(error.message);
  return `🗑️ Listo, eliminé el recordatorio "${reminder.description}".`;
}

// For sorting/display on the dashboard — "when does this next come due", regardless of any
// remind_days_before advance notice (that only affects when the notification fires, not the date
// the reminder is actually about).
export function nextRecurringOccurrence(dayOfMonth: number, todayISO: string): string {
  const [year, month, day] = todayISO.split("-").map(Number);
  const daysInThisMonth = lastDayOfMonth(month, year);
  const thisMonthDay = Math.min(dayOfMonth, daysInThisMonth);
  if (thisMonthDay >= day) return `${year}-${String(month).padStart(2, "0")}-${String(thisMonthDay).padStart(2, "0")}`;
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const daysInNextMonth = lastDayOfMonth(nextMonth, nextYear);
  const nextMonthDay = Math.min(dayOfMonth, daysInNextMonth);
  return `${nextYear}-${String(nextMonth).padStart(2, "0")}-${String(nextMonthDay).padStart(2, "0")}`;
}
