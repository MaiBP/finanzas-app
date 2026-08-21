// Fixed set so every currency selector (account create/edit, moneda base) offers the same options —
// extend here to support more. Each account keeps its own currency; nothing here converts between
// them, that's handled at query time when an aggregate needs to mix currencies.
export const SUPPORTED_CURRENCIES = ["EUR", "USD", "GBP", "ARS", "MXN", "BRL"] as const;
export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];

export const CURRENCY_LABELS: Record<CurrencyCode, string> = {
  EUR: "Euro (€)",
  USD: "Dólar estadounidense (US$)",
  GBP: "Libra esterlina (£)",
  ARS: "Peso argentino (AR$)",
  MXN: "Peso mexicano (MX$)",
  BRL: "Real brasileño (R$)",
};

export function isSupportedCurrency(value: string): value is CurrencyCode {
  return (SUPPORTED_CURRENCIES as readonly string[]).includes(value);
}

export function parseCurrency(value: FormDataEntryValue | null, fallback: CurrencyCode = "EUR"): CurrencyCode {
  const text = String(value ?? "").trim().toUpperCase();
  return isSupportedCurrency(text) ? text : fallback;
}
