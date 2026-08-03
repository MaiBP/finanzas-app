import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentHousehold } from "@/lib/household";
import { TransactionForm } from "@/components/transactions/transaction-form";
import type { Account, Category } from "@/types/database";

export default async function NewTransactionPage() {
  const { supabase, user, household } = await getCurrentHousehold();
  if (!household) return null;
  const [{ data: accounts }, { data: categories }] = await Promise.all([
    supabase.from("accounts").select("id,name").eq("household_id",household.id).is("archived_at",null).or(`owner_user_id.eq.${user.id},is_shared.eq.true`).order("name"),
    supabase.from("categories").select("id,name,kind,icon,color").or(`household_id.eq.${household.id},household_id.is.null`).order("name"),
  ]);
  return <div className="mx-auto max-w-2xl"><Link href="/app/movimientos" className="mb-5 flex items-center gap-2 text-sm font-bold text-[#6c7f7a]"><ArrowLeft size={17}/>Movimientos</Link><h1 className="text-3xl font-black tracking-tight">Nuevo movimiento</h1><p className="mt-2 text-[#6c7f7a]">Apunta lo que acaba de pasar. Podrás corregirlo después.</p><section className="card mt-7 p-6 md:p-8"><TransactionForm accounts={(accounts ?? []) as Pick<Account,"id"|"name">[]} categories={(categories ?? []) as Category[]}/></section></div>;
}
