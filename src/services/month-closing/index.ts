import { calculateAccountBalance } from "@/lib/finance/account-overview";

// Same trick used elsewhere in the codebase (see query-service's monthEnd): day 0 of the month
// after `month` (1-indexed here) is the last day of `month` itself.
export function lastDayOfMonth(month: number, year: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function isLastDayOfMonth(dateISO: string): boolean {
  const [year, month, day] = dateISO.split("-").map(Number);
  return day === lastDayOfMonth(month, year);
}

export type SnapshotAccount = { id: string; name: string; type: string; currency: string };
export type SnapshotMovement = { account_id: string; type: "expense" | "income"; amount_cents: number };
export type AccountBreakdownEntry = { id: string; name: string; type: string; currency: string; balance_cents: number };

// Pure so it's testable without a DB — the route just fetches accounts/movements and hands them
// here. Mirrors the dashboard/Cuentas convention: the total only ever sums accounts in the
// household's base currency (mixing currencies would be meaningless), but every shared account
// still gets its own entry in the breakdown regardless of currency.
export function buildMonthClosingSnapshot(accounts: SnapshotAccount[], movements: SnapshotMovement[], baseCurrency: string) {
  const breakdown: AccountBreakdownEntry[] = accounts.map((account) => ({
    id: account.id,
    name: account.name,
    type: account.type,
    currency: account.currency,
    balance_cents: calculateAccountBalance(account.id, movements),
  }));
  const totalBalanceCents = breakdown
    .filter((account) => account.currency === baseCurrency)
    .reduce((sum, account) => sum + account.balance_cents, 0);
  return { totalBalanceCents, breakdown };
}
