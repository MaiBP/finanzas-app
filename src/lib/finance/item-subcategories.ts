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

// Display-only shorthand for narrow chat layouts (Telegram previews) — never stored. The full
// name from ITEM_SUBCATEGORIES is always what's persisted in transaction_items and shown on web.
const ABBREVIATIONS: Record<string, string> = {
  "Frutas y verduras": "Frutas/Verd",
  "Carnes y pescado": "Carnes/Pesc",
  "Lácteos y huevos": "Lácteos/Huev",
  "Snacks y dulces": "Snacks/Dulc",
  "Higiene personal": "Higiene",
};

export function abbreviateItemSubcategory(subcategory: string) {
  return ABBREVIATIONS[subcategory] ?? subcategory;
}
