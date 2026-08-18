"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { ITEM_SUBCATEGORIES } from "@/lib/finance/item-subcategories";

type EditableItem = { description: string; amount: string; subcategory: string };
type InitialItem = { description: string; amount_cents: number; subcategory: string };

function toEditable(item: InitialItem): EditableItem {
  return { description: item.description, amount: (item.amount_cents / 100).toFixed(2).replace(".", ","), subcategory: item.subcategory };
}

export function ItemListEditor({ initialItems }: { initialItems: InitialItem[] }) {
  const [items, setItems] = useState<EditableItem[]>(initialItems.map(toEditable));

  const update = (index: number, field: keyof EditableItem, value: string) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };
  const remove = (index: number) => setItems((prev) => prev.filter((_, i) => i !== index));
  const add = () => setItems((prev) => [...prev, { description: "", amount: "", subcategory: ITEM_SUBCATEGORIES[0] }]);

  return (
    <div>
      <input type="hidden" name="items" value={JSON.stringify(items)} />
      {items.length === 0 && <p className="text-sm text-(--muted)">Sin productos detallados.</p>}
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={index} className="grid grid-cols-[minmax(0,1fr)_90px_auto] gap-2 sm:grid-cols-[minmax(0,1fr)_90px_150px_auto]">
            <input
              className="field"
              value={item.description}
              onChange={(event) => update(index, "description", event.target.value)}
              placeholder="Producto"
              maxLength={160}
            />
            <input
              className="field"
              value={item.amount}
              onChange={(event) => update(index, "amount", event.target.value)}
              placeholder="0,00"
              inputMode="decimal"
            />
            <select
              className="field col-span-2 sm:col-span-1"
              value={item.subcategory}
              onChange={(event) => update(index, "subcategory", event.target.value)}
            >
              {ITEM_SUBCATEGORIES.map((subcategory) => (
                <option key={subcategory} value={subcategory}>{subcategory}</option>
              ))}
            </select>
            <button type="button" onClick={() => remove(index)} aria-label="Quitar producto" className="rounded-lg p-2">
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
      <button type="button" onClick={add} className="mt-3 flex items-center gap-1 text-sm font-bold">
        <Plus size={16} /> Agregar producto
      </button>
    </div>
  );
}
