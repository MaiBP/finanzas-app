"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReadOnlyModal } from "@/components/trial/read-only-modal";

export function DeleteAccountButton({
  id,
  name,
  action,
  isWritable = true,
}: {
  id: string;
  name: string;
  action: (formData: FormData) => void | Promise<void>;
  isWritable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [readOnlyOpen, setReadOnlyOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <>
      <form ref={formRef} action={action} className="contents">
        <input type="hidden" name="id" value={id} />
      </form>
      <button
        type="button"
        aria-label={`Eliminar ${name}`}
        className="rounded-lg p-2"
        onClick={() => (isWritable ? setOpen(true) : setReadOnlyOpen(true))}
      >
        <Trash2 size={17} />
      </button>
      <ReadOnlyModal open={readOnlyOpen} onClose={() => setReadOnlyOpen(false)} />
      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-(--ink)/40 p-4"
          role="presentation"
          onClick={() => setOpen(false)}
        >
          <div
            className="card w-full max-w-sm p-6 text-center"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-account-title"
            onClick={(event) => event.stopPropagation()}
          >
            <Image src="/thinking-face.png" alt="" width={96} height={96} className="mx-auto h-20 w-20 sm:h-24 sm:w-24" />
            <p id="delete-account-title" className="mt-4 font-black">
              Hmm, ¿estás seguro de eliminar esta cuenta?
            </p>
            <p className="mt-1 truncate text-sm text-(--muted)">“{name}”</p>
            <p className="mt-2 text-xs text-(--muted)">
              Deja de estar disponible para nuevos movimientos. Los que ya registraste con ella se conservan en tus
              reportes e historial.
            </p>
            <div className="mt-5 flex gap-3">
              <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                className="flex-1"
                onClick={() => {
                  formRef.current?.requestSubmit();
                  setOpen(false);
                }}
              >
                Aceptar
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
