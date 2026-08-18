"use client";

import { Trash2 } from "lucide-react";

export function DeleteTransactionButton({ description }: { description: string }) {
  return (
    <button
      type="submit"
      aria-label={`Eliminar ${description}`}
      className="rounded-lg p-2"
      onClick={(event) => {
        if (!window.confirm(`¿Seguro que quieres eliminar "${description}"? Esta acción no se puede deshacer.`)) {
          event.preventDefault();
        }
      }}
    >
      <Trash2 size={17} />
    </button>
  );
}
