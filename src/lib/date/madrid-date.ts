/** Today's date as YYYY-MM-DD in the Europe/Madrid timezone — the app's reference timezone for
 * any cron that needs to reason about "today" rather than the server's UTC clock. */
export function madridDateISO(): string {
  const parts = new Intl.DateTimeFormat("en", { timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}
