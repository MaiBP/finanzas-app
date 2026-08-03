import type { FinancialAction } from "./schema";

const explicitPersonalIntent = /(?:\bpersonal\b|\bprivad[oa]\b|solo para m[ií]|solo m[ií]o|solo m[ií]a|para m[ií]|no (?:es |sea )?compartid[oa]\b)/i;

export function applyFinancialDefaults(action: FinancialAction, originalText: string): FinancialAction {
  if (action.action !== "create_transaction") return action;

  if (explicitPersonalIntent.test(originalText)) {
    return {
      ...action,
      data: { ...action.data, scope: "personal", privacy: "private", split_type: "single" },
    };
  }

  return {
    ...action,
    data: {
      ...action.data,
      scope: "shared",
      privacy: "visible",
      split_type: "equal",
    },
  };
}
