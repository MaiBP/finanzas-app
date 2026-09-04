"use client";

import { Lock } from "lucide-react";
import { Button, LinkButton } from "@/components/ui/button";

/** Popped by GuardedSubmitButton instead of letting a mutating action through once a household's
 * trial has ended — same message as ReadOnlyNotice, but for actions triggered from a page the
 * user is otherwise legitimately viewing (editing/deleting/adjusting), rather than a page whose
 * whole purpose is to create something. */
export function ReadOnlyModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-(--ink)/40 p-4" role="presentation" onClick={onClose}>
      <div
        className="card w-full max-w-sm p-6 text-center"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="read-only-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-(--danger)/15">
          <Lock size={24} className="text-(--danger)" />
        </span>
        <p id="read-only-modal-title" className="mt-4 font-black">
          Tu prueba de 30 días terminó
        </p>
        <p className="mt-1 text-sm text-(--muted)">
          Podés ver todo tu historial, pero para crear, editar o eliminar necesitás activar tu suscripción por 4,99 €/mes.
        </p>
        <div className="mt-5 flex gap-3">
          <Button type="button" variant="outline" size="sm" className="flex-1" onClick={onClose}>
            Cerrar
          </Button>
          <LinkButton href="/app/ajustes" size="sm" className="flex-1">
            Activar suscripción
          </LinkButton>
        </div>
      </div>
    </div>
  );
}
