import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { getCurrentHousehold } from "@/lib/household";
import { getHouseholdTrialStatus } from "@/lib/trial/status";
import { TransactionForm } from "@/components/transactions/transaction-form";
import { ReadOnlyNotice } from "@/components/trial/read-only-notice";
import type { Account, Category } from "@/types/database";

export default async function NewTransactionPage() {
  const { supabase, household } = await getCurrentHousehold();
  if (!household) return null;
  if (!getHouseholdTrialStatus(household).isWritable) {
    return <div className="mx-auto max-w-2xl"><Link href="/app/movimientos" className="mb-5 flex items-center gap-2 text-sm font-bold text-[#6c7f7a]"><ArrowLeft size={17}/>Movimientos</Link><ReadOnlyNotice action="registrar nuevos movimientos" /></div>;
  }
  const [{ data: accounts }, { data: categories }] = await Promise.all([
    supabase.from("accounts").select("id,name,currency").eq("household_id",household.id).eq("is_shared",true).neq("type","joint").is("archived_at",null).order("name"),
    supabase.from("categories").select("id,name,kind,icon,color").or(`household_id.eq.${household.id},household_id.is.null`).order("name"),
  ]);
  return <div className="mx-auto max-w-2xl"><Link href="/app/movimientos" className="mb-5 flex items-center gap-2 text-sm font-bold text-[#6c7f7a]"><ArrowLeft size={17}/>Movimientos</Link><h1 className="text-3xl font-black tracking-tight">Nuevo movimiento conjunto</h1><p className="mt-2 text-[#6c7f7a]">Se registrará en la cuenta del hogar y se repartirá entre sus miembros.</p><div className="relative mt-7"><Image src="/writing-hand.png" alt="" width={112} height={112} className="absolute -top-6 -left-5 z-1 size-16 -rotate-6 object-contain drop-shadow-[3px_3px_0_rgba(58,52,52,0.18)] sm:-top-7 sm:-left-6 sm:size-20"/><section className="card p-6 md:p-8"><TransactionForm accounts={(accounts ?? []) as Pick<Account,"id"|"name"|"currency">[]} categories={(categories ?? []) as Category[]}/></section></div></div>;
}
