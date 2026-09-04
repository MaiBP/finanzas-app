"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { softDeleteTransaction } from "@/app/(dashboard)/app/actions";
import { ReadOnlyModal } from "@/components/trial/read-only-modal";

export function DeleteTransactionButton({ id, description, returnTo, isWritable = true }: { id: string; description: string; returnTo?: string; isWritable?: boolean }) {
  const [open, setOpen] = useState(false);
  const [readOnlyOpen, setReadOnlyOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <>
      <form ref={formRef} action={softDeleteTransaction} className="contents">
        <input type="hidden" name="id" value={id} />
        {returnTo && <input type="hidden" name="returnTo" value={returnTo} />}
      </form>
      <button
        type="button"
        aria-label={`Eliminar ${description}`}
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
            aria-labelledby="delete-transaction-title"
            onClick={(event) => event.stopPropagation()}
          >
            <Image src="/thinking-face.png" alt="" width={96} height={96} className="mx-auto h-20 w-20 sm:h-24 sm:w-24" />
            <p id="delete-transaction-title" className="mt-4 font-black">
              Hmm, ¿estás seguro de eliminar este movimiento?
            </p>
            <p className="mt-1 truncate text-sm text-(--muted)">“{description}”</p>
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
