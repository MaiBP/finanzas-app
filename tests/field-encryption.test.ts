import { randomBytes } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";

process.env.FIELD_ENCRYPTION_KEY = randomBytes(32).toString("base64");

const { encryptField, decryptField, isEncryptedField } = await import("@/lib/security/field-encryption");

describe("field encryption", () => {
  it("round-trips a plaintext value", () => {
    const ciphertext = encryptField("Alquiler agosto");
    expect(ciphertext).not.toBe("Alquiler agosto");
    expect(decryptField(ciphertext)).toBe("Alquiler agosto");
  });

  it("produces a versioned, non-deterministic ciphertext", () => {
    const a = encryptField("Maira");
    const b = encryptField("Maira");
    expect(isEncryptedField(a)).toBe(true);
    expect(a).not.toBe(b);
    expect(decryptField(a)).toBe("Maira");
    expect(decryptField(b)).toBe("Maira");
  });

  it("passes legacy plaintext through unchanged instead of throwing", () => {
    expect(isEncryptedField("Supermercado")).toBe(false);
    expect(decryptField("Supermercado")).toBe("Supermercado");
  });

  it("round-trips unicode and empty-ish short strings", () => {
    const value = "Café con José 🧉";
    expect(decryptField(encryptField(value))).toBe(value);
  });
});

describe("field encryption without a configured key", () => {
  const originalKey = process.env.FIELD_ENCRYPTION_KEY;

  beforeEach(() => {
    delete process.env.FIELD_ENCRYPTION_KEY;
  });

  it("throws instead of silently storing plaintext", () => {
    expect(() => encryptField("algo")).toThrow(/FIELD_ENCRYPTION_KEY/);
    process.env.FIELD_ENCRYPTION_KEY = originalKey;
  });
});
