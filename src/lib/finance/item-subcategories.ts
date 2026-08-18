// Fixed set so item-level spending can be grouped consistently across receipts and typed/spoken
// breakdowns instead of fragmenting into near-duplicate free-text labels ("snacks" vs "aperitivos").
export const ITEM_SUBCATEGORIES = ["Frutas y verduras", "Carnes y pescado", "Lácteos y huevos", "Panadería", "Bebidas", "Snacks y dulces", "Congelados", "Limpieza", "Higiene personal", "Alcohol", "Despensa", "Otros"];

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

const bySubcategory = new Map(ITEM_SUBCATEGORIES.map((subcategory) => [normalize(subcategory), subcategory]));

export function normalizeItemSubcategory(value: string) {
  return bySubcategory.get(normalize(value)) ?? "Otros";
}
