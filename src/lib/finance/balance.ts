export interface SplitInput { userId: string; amountCents: number }
export interface SharedExpense { paidBy: string; amountCents: number; splits: SplitInput[] }

export function equalSplit(amountCents: number, userIds: string[]): SplitInput[] {
  if (amountCents <= 0 || userIds.length === 0) throw new Error("Datos de reparto no válidos");
  const base = Math.floor(amountCents / userIds.length);
  let remainder = amountCents % userIds.length;
  return userIds.map((userId) => ({
    userId,
    amountCents: base + (remainder-- > 0 ? 1 : 0),
  }));
}

export function calculateNetBalances(expenses: SharedExpense[]) {
  const balances = new Map<string, number>();
  for (const expense of expenses) {
    const splitTotal = expense.splits.reduce((sum, split) => sum + split.amountCents, 0);
    if (splitTotal !== expense.amountCents) throw new Error("El reparto no coincide con el total");
    balances.set(expense.paidBy, (balances.get(expense.paidBy) ?? 0) + expense.amountCents);
    for (const split of expense.splits) {
      balances.set(split.userId, (balances.get(split.userId) ?? 0) - split.amountCents);
    }
  }
  return Object.fromEntries(balances);
}
