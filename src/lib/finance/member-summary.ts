export type MemberMovement = {
  created_by: string | null;
  type: "expense" | "income";
  amount_cents: number;
};

export function calculateMemberSummary(movements: MemberMovement[]) {
  const totals = new Map<string | null, { expenses: number; income: number }>();
  for (const movement of movements) {
    const current = totals.get(movement.created_by) ?? {
      expenses: 0,
      income: 0,
    };
    if (movement.type === "expense") current.expenses += movement.amount_cents;
    else current.income += movement.amount_cents;
    totals.set(movement.created_by, current);
  }
  return totals;
}
