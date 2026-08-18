import { describe, expect, it } from "vitest";
import { abbreviateItemSubcategory, ITEM_SUBCATEGORIES, normalizeItemSubcategory } from "@/lib/finance/item-subcategories";

describe("normalizeItemSubcategory", () => {
  it("matches case- and accent-insensitively against the canonical list", () => {
    expect(normalizeItemSubcategory("carnes y pescado")).toBe("Carnes y pescado");
    expect(normalizeItemSubcategory("LÁCTEOS Y HUEVOS")).toBe("Lácteos y huevos");
    expect(normalizeItemSubcategory("lacteos y huevos")).toBe("Lácteos y huevos");
  });

  it("falls back to Otros for anything outside the canonical list", () => {
    expect(normalizeItemSubcategory("aperitivos")).toBe("Otros");
    expect(normalizeItemSubcategory("")).toBe("Otros");
  });

  it("exposes a fixed, non-empty list of subcategories", () => {
    expect(ITEM_SUBCATEGORIES.length).toBeGreaterThan(0);
    expect(ITEM_SUBCATEGORIES).toContain("Otros");
  });
});

describe("abbreviateItemSubcategory", () => {
  it("shortens the long compound names for narrow chat layouts", () => {
    expect(abbreviateItemSubcategory("Snacks y dulces")).toBe("Snacks/Dulc");
    expect(abbreviateItemSubcategory("Carnes y pescado")).toBe("Carnes/Pesc");
  });

  it("leaves already-short names unchanged", () => {
    expect(abbreviateItemSubcategory("Bebidas")).toBe("Bebidas");
    expect(abbreviateItemSubcategory("Otros")).toBe("Otros");
  });
});
