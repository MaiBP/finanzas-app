import { ArrowRight, Home, Users } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentHousehold } from "@/lib/household";
import { SubmitButton } from "@/components/ui/submit-button";
import { createHousehold, joinHousehold } from "./actions";

export default async function Onboarding({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { household } = await getCurrentHousehold(); if (household) redirect("/app");
  const { error } = await searchParams;

  return <main className="relative min-h-screen overflow-hidden px-5 py-10 md:py-14"><div aria-hidden className="absolute -left-20 top-1/3 size-56 rounded-full bg-[#73c8dc]/80"/><div aria-hidden className="absolute -right-24 top-12 size-64 rounded-full bg-[#e19bf5]/75"/><div className="relative z-10 mx-auto max-w-5xl"><div className="text-center"><span className="mx-auto grid size-12 place-items-center rounded-full bg-[#3a3434] text-xl font-black text-[#ffff50]">a</span><p className="mx-auto mt-5 w-fit bg-[#ffff50] px-2 text-xs font-black uppercase tracking-wider">Primer paso</p><h1 className="mt-4 text-4xl font-black tracking-tight md:text-5xl">¿Dónde organizamos las cuentas?</h1><p className="mx-auto mt-3 max-w-xl text-[#3a3434]/75">Crea un hogar para empezar desde cero o entra al espacio que vuestra pareja ya preparó.</p></div>
    {error && <p className="mx-auto mt-6 max-w-xl rounded-xl border border-red-700/20 bg-red-50 p-3 text-center text-sm font-bold text-red-700">{error}</p>}
    <div className="mt-10 grid gap-6 md:grid-cols-2">
      <section className="card overflow-hidden" style={{backgroundColor:"#73c8dc"}}><div className="flex items-center justify-between border-b border-[#3a3434]/20 p-6"><span className="grid size-12 place-items-center rounded-full bg-[#ffff50]"><Home size={22}/></span><span className="text-5xl font-black text-[#3a3434]/20">01</span></div><div className="p-7"><p className="w-fit bg-[#ffff50] px-1 text-xs font-black uppercase">Nuevo espacio compartido</p><h2 className="mt-3 text-2xl font-black">Crear un hogar</h2><p className="mt-2 min-h-12 text-sm text-[#3a3434]/75">Serás la persona propietaria y podrás invitar a quien quieras.</p><form action={createHousehold} className="mt-6 space-y-4"><label><span className="label text-[#3a3434]!">Nombre del hogar</span><input className="field" name="name" required minLength={2} maxLength={80} placeholder="Casa de Maira y Pablo"/></label><SubmitButton>Crear hogar</SubmitButton></form></div></section>

      <section className="card overflow-hidden" style={{backgroundColor:"#e19bf5"}}><div className="flex items-center justify-between border-b border-[#3a3434]/20 p-6"><span className="grid size-12 place-items-center rounded-full bg-[#ffff50]"><Users size={22}/></span><span className="text-5xl font-black text-[#3a3434]/20">02</span></div><div className="p-7"><p className="w-fit bg-[#ffff50] px-1 text-xs font-black uppercase">Ya existe un hogar</p><h2 className="mt-3 text-2xl font-black">Tengo una invitación</h2><p className="mt-2 min-h-12 text-sm text-[#3a3434]/75">Escribe el código de ocho caracteres que te han compartido.</p><form action={joinHousehold} className="mt-6 space-y-4"><label><span className="label text-[#3a3434]!">Código de invitación</span><input className="field uppercase tracking-[.2em]" name="code" required minLength={8} maxLength={8} placeholder="ABC12345"/></label><SubmitButton>Unirme <ArrowRight className="ml-2 inline" size={17}/></SubmitButton></form></div></section>
    </div>
    <p className="mx-auto mt-8 w-fit bg-[#87cd64] px-3 py-1 text-center text-xs font-bold">Cada persona mantiene además un espacio privado y separado.</p>
  </div></main>;
}
