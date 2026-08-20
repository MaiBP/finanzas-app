import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentHousehold } from "@/lib/household";
import { TransactionForm } from "@/components/transactions/transaction-form";
import type { Account, Category } from "@/types/database";

export default async function NewPersonalTransactionPage() {
  const { supabase, user, household } = await getCurrentHousehold();
  if (!household) return null;
  const [{ data: accounts }, { data: categories }] = await Promise.all([
    supabase.from("accounts").select("id,name").eq("household_id", household.id).eq("owner_user_id", user.id).eq("is_shared", false).is("archived_at", null).order("name"),
    supabase.from("categories").select("id,name,kind,icon,color").or(`household_id.eq.${household.id},household_id.is.null`).order("name"),
  ]);
  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/app/personal/movimientos" className="mb-5 flex items-center gap-2 text-sm font-bold text-[#6c7f7a]">
        <ArrowLeft size={17} />Movimientos personales
      </Link>
      <h1 className="text-3xl font-black tracking-tight">Nuevo movimiento personal</h1>
      <p className="mt-2 text-[#6c7f7a]">Solo vos vas a poder verlo; no se muestra a otros miembros del hogar.</p>
      <section className="card mt-7 p-6 md:p-8">
        <TransactionForm
          mode="personal"
          accounts={(accounts ?? []) as Pick<Account, "id" | "name">[]}
          categories={(categories ?? []) as Category[]}
        />
      </section>
    </div>
  );
}
