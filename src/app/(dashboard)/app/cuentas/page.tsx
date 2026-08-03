import Link from "next/link";
import { ArrowRight, Landmark, UsersRound } from "lucide-react";
import { getCurrentHousehold } from "@/lib/household";
import { formatMoney } from "@/lib/finance/money";

type AccountRow={id:string;name:string;type:string;current_balance_cents:number};
export default async function AccountsPage(){
  const {supabase,household}=await getCurrentHousehold(); if(!household)return null;
  const {data}=await supabase.from("accounts").select("id,name,type,current_balance_cents").eq("household_id",household.id).eq("is_shared",true).is("archived_at",null).order("name");
  const accounts=(data??[]) as AccountRow[];
  return <><h1 className="text-3xl font-black">Cuentas conjuntas</h1><p className="mt-2 text-[#6c7f7a]">El dinero que gestionáis entre los miembros del hogar.</p>
    <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{accounts.map(account=><article className="card p-5" key={account.id}><div className="flex items-center justify-between"><span className="grid size-11 place-items-center rounded-xl bg-[#87cd64]"><Landmark/></span><span className="rounded-full bg-[#e19bf5] px-2.5 py-1 text-xs font-bold">Conjunta</span></div><h2 className="mt-5 font-black">{account.name}</h2><p className="mt-1 text-2xl font-black">{formatMoney(account.current_balance_cents)}</p></article>)}</div>
    <section className="card mt-7 flex max-w-2xl flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between"><div className="flex gap-3"><UsersRound className="shrink-0"/><div><h2 className="font-black">¿Quieres gestionar dinero solo tuyo?</h2><p className="mt-1 text-sm text-[#6c7f7a]">Crea cuentas y movimientos privados en un espacio separado.</p></div></div><Link href="/app/personal" className="flex shrink-0 items-center justify-center gap-2 rounded-xl px-5 py-3 font-bold">Mi espacio <ArrowRight size={17}/></Link></section>
  </>;
}
