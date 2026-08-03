"use client";
import { useFormStatus } from "react-dom";

export function SubmitButton({ children, pendingText = "Guardando…" }: { children: React.ReactNode; pendingText?: string }) {
  const { pending } = useFormStatus();
  return <button disabled={pending} className="w-full rounded-xl bg-[#26725c] px-5 py-3 font-bold text-white transition hover:bg-[#1e5d4b] disabled:opacity-60">{pending ? pendingText : children}</button>;
}
