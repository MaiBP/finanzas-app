"use server";
import { redirect } from "next/navigation";
import { getCurrentHousehold } from "@/lib/household";
import { eurosToCents } from "@/lib/finance/money";

export async function editTransaction(formData:FormData){
  const {supabase,user,household}=await getCurrentHousehold(); if(!household)throw new Error("Sin hogar");
  const id=String(formData.get("id")); const description=String(formData.get("description")??"").trim(); const accountId=String(formData.get("accountId")); const categoryId=String(formData.get("categoryId")); const transactionDate=String(formData.get("transactionDate")); const amountCents=eurosToCents(String(formData.get("amount")));
  if(description.length<2)throw new Error("Datos no válidos");
  const {data:transaction}=await supabase.from("transactions").select("scope,type").eq("id",id).eq("created_by",user.id).eq("status","confirmed").maybeSingle();
  if(!transaction)throw new Error("Movimiento no encontrado");
  let accountQuery=supabase.from("accounts").select("id").eq("id",accountId).eq("household_id",household.id).is("archived_at",null);
  accountQuery=transaction.scope==="shared"?accountQuery.eq("is_shared",true):accountQuery.eq("is_shared",false).eq("owner_user_id",user.id);
  const [{data:account},{data:category}]=await Promise.all([accountQuery.maybeSingle(),supabase.from("categories").select("id,kind").eq("id",categoryId).maybeSingle()]);
  if(!account||!category||category.kind!==transaction.type)throw new Error("Cuenta o categoría no válida");
  const privacy=transaction.scope==="shared"?"visible":"private";
  const {error}=await supabase.rpc("update_financial_transaction",{p_transaction_id:id,p_account_id:accountId,p_amount_cents:amountCents,p_description:description,p_category_id:categoryId,p_scope:transaction.scope,p_privacy:privacy,p_transaction_date:transactionDate});
  if(error)throw new Error(error.message); redirect(transaction.scope==="personal"?"/app/personal":"/app/movimientos");
}
