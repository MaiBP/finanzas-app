import { describe, expect, it } from "vitest";
import { isSupportedCurrency, parseCurrency, SUPPORTED_CURRENCIES } from "@/lib/finance/currencies";

describe("currencies", () => {
  it("recognizes every supported code and rejects anything else", () => {
    for (const code of SUPPORTED_CURRENCIES) expect(isSupportedCurrency(code)).toBe(true);
    expect(isSupportedCurrency("JPY")).toBe(false);
    expect(isSupportedCurrency("eur")).toBe(false);
  });

  it("parses a form value case-insensitively, trimmed", () => {
    expect(parseCurrency(" usd ")).toBe("USD");
    expect(parseCurrency("ars")).toBe("ARS");
  });

  it("falls back to EUR (or a given default) for null, empty or unsupported input", () => {
    expect(parseCurrency(null)).toBe("EUR");
    expect(parseCurrency("")).toBe("EUR");
    expect(parseCurrency("JPY")).toBe("EUR");
    expect(parseCurrency("JPY", "USD")).toBe("USD");
  });
});
