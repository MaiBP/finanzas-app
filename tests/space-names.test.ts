import { describe, expect, it } from "vitest";
import { normalizeSpaceName } from "@/lib/settings/space-names";

describe("space names", () => {
  it("trims and collapses whitespace", () => expect(normalizeSpaceName("  Mis   finanzas  ", 50)).toBe("Mis finanzas"));
  it("rejects names outside the accepted length", () => {
    expect(() => normalizeSpaceName("A", 50)).toThrow();
    expect(() => normalizeSpaceName("x".repeat(51), 50)).toThrow();
  });
});
