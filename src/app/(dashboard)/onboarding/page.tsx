import { Home, Users } from "lucide-react";
import { getCurrentHousehold } from "@/lib/household";
import { redirect } from "next/navigation";
import { SubmitButton } from "@/components/ui/submit-button";
import { createHousehold, joinHousehold } from "./actions";

export default async function Onboarding({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { household } = await getCurrentHousehold(); if (household) redirect("/app");
  const { error } = await searchParams;
  return <main className="mx-auto min-h-screen max-w-4xl px-5 py-12"><div className="text-center"><span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#26725c] text-xl font-black text-white">a</span><h1 className="mt-6 text-4xl font-black tracking-tight">¿Dónde organizamos las cuentas?</h1><p className="mt-3 text-[#6c7f7a]">Crea un hogar o entra con el código que te han enviado.</p></div>{error && <p className="mx-auto mt-6 max-w-xl rounded-xl bg-red-50 p-3 text-center text-sm text-red-700">{error}</p>}<div className="mt-10 grid gap-5 md:grid-cols-2"><section className="card p-7"><Home className="text-[#26725c]"/><h2 className="mt-4 text-xl font-black">Crear un hogar</h2><p className="mt-1 text-sm text-[#6c7f7a]">Serás la persona propietaria y podrás invitar a quien quieras.</p><form action={createHousehold} className="mt-6 space-y-4"><label><span className="label">Nombre del hogar</span><input className="field" name="name" required placeholder="Casa de Maira y Pablo"/></label><SubmitButton>Crear hogar</SubmitButton></form></section><section className="card p-7"><Users className="text-[#e88064]"/><h2 className="mt-4 text-xl font-black">Tengo una invitación</h2><p className="mt-1 text-sm text-[#6c7f7a]">Escribe el código de ocho caracteres que te han compartido.</p><form action={joinHousehold} className="mt-6 space-y-4"><label><span className="label">Código</span><input className="field uppercase tracking-[.2em]" name="code" required maxLength={8} placeholder="ABC12345"/></label><SubmitButton>Unirme</SubmitButton></form></section></div></main>;
}
