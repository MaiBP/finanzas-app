import type { FinancialAction } from "./schema";

const explicitPersonalIntent = /(?:\bpersonal\b|\bprivad[oa]\b|solo para m[ií]|solo m[ií]o|solo m[ií]a|para m[ií]|no (?:es |sea )?compartid[oa]\b)/i;
const explicitHistoricalAccountsIntent = /(?:hist[oó]ric[oa]|cuentas?\s+(?:borrad[oa]s?|eliminad[oa]s?)|cuentas?\s+que\s+(?:borr[eé]|elimin[eé]))/i;

function normalize(value: string) {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLocaleLowerCase("es").trim();
}

// The model is told to put a merchant/keyword like "café" or "Amazon" in search_text and reserve
// category for a real category name, but it doesn't always follow that split consistently — the
// same term ends up in filters.category on one turn and filters.search_text on the next, and
// fetchQueryRows applies filters.category literally (only matching a real category name), so a
// mistaken category value silently returns "no data" instead of finding the transactions a
// search_text query would. Rerouting here doesn't depend on the model getting the split right.
function isKnownCategory(categories: { name: string }[], term: string) {
  const normalizedTerm = normalize(term);
  return categories.some((category) => {
    const normalizedName = normalize(category.name);
    return normalizedName === normalizedTerm || normalizedName.includes(normalizedTerm) || normalizedTerm.includes(normalizedName);
  });
}

export function applyFinancialDefaults(action: FinancialAction, originalText: string, categories: { name: string }[] = []): FinancialAction {
  if (action.action === "query_finances") {
    let next = action;
    const { filters } = next.data;
    if (filters.category && !isKnownCategory(categories, filters.category)) {
      next = { ...next, data: { ...next.data, filters: { ...next.data.filters, category: null, search_text: filters.search_text ?? filters.category } } };
    }
    if (explicitHistoricalAccountsIntent.test(originalText)) {
      next = { ...next, data: { ...next.data, filters: { ...next.data.filters, include_deleted_accounts: true } } };
    }
    return next;
  }

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
