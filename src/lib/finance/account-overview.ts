type BalanceMovement = { account_id: string; type: "expense" | "income"; amount_cents: number };
type ExpenseMovement = { account_id: string; paid_by: string; amount_cents: number };

export function calculateAccountBalance(initialBalance: number, accountId: string, movements: BalanceMovement[]) {
  return movements.reduce((balance, movement) => {
    if (movement.account_id !== accountId) return balance;
    return balance + (movement.type === "income" ? movement.amount_cents : -movement.amount_cents);
  }, initialBalance);
}

export function calculateBaseForTargetBalance(targetBalance: number, accountId: string, movements: BalanceMovement[]) {
  return movements.reduce((base, movement) => {
    if (movement.account_id !== accountId) return base;
    return base - (movement.type === "income" ? movement.amount_cents : -movement.amount_cents);
  }, targetBalance);
}

export function calculateParticipantExpenses(accountId: string, movements: ExpenseMovement[]) {
  const totals = new Map<string, number>();
  for (const movement of movements) {
    if (movement.account_id !== accountId) continue;
    totals.set(movement.paid_by, (totals.get(movement.paid_by) ?? 0) + movement.amount_cents);
  }
  return totals;
}
