"use server";
import { redirect } from "next/navigation";
import { getCurrentHousehold } from "@/lib/household";
import { eurosToCents } from "@/lib/finance/money";
import { encryptField } from "@/lib/security/field-encryption";
import { normalizeItemSubcategory } from "@/lib/finance/item-subcategories";
import { SYNTHETIC_BALANCE_CATEGORY } from "@/lib/finance/synthetic-transactions";
import { friendlyRpcError } from "@/lib/trial/errors";

type SubmittedItem = { description: string; amount: string; subcategory: string };

export async function editTransaction(formData:FormData){
  const {supabase,user,household}=await getCurrentHousehold(); if(!household)throw new Error("Sin hogar");
  const id=String(formData.get("id")); const description=String(formData.get("description")??"").trim(); const accountId=String(formData.get("accountId")); const categoryId=String(formData.get("categoryId")); const transactionDate=String(formData.get("transactionDate")); const amountCents=eurosToCents(String(formData.get("amount")));
  if(description.length<2||description.length>160)throw new Error("La descripción debe tener entre 2 y 160 caracteres.");
  const {data:transactionRow}=await supabase.from("transactions").select("scope,type,categories(name)").eq("id",id).eq("created_by",user.id).eq("status","confirmed").maybeSingle();
  const transaction=transactionRow as {scope:"shared"|"personal";type:"expense"|"income";categories:{name:string}|null}|null;
  if(!transaction)throw new Error("Movimiento no encontrado");
  if(transaction.categories?.name===SYNTHETIC_BALANCE_CATEGORY)throw new Error("Este movimiento sostiene el saldo de la cuenta y no se puede editar directamente.");
  let accountQuery=supabase.from("accounts").select("id").eq("id",accountId).eq("household_id",household.id).is("archived_at",null);
  accountQuery=transaction.scope==="shared"?accountQuery.eq("is_shared",true):accountQuery.eq("is_shared",false).eq("owner_user_id",user.id);
  const [{data:account},{data:category}]=await Promise.all([accountQuery.maybeSingle(),supabase.from("categories").select("id,kind").eq("id",categoryId).maybeSingle()]);
  if(!account||!category||category.kind!==transaction.type)throw new Error("Cuenta o categoría no válida");
  const privacy=transaction.scope==="shared"?"visible":"private";
  const {error}=await supabase.rpc("update_financial_transaction",{p_transaction_id:id,p_account_id:accountId,p_amount_cents:amountCents,p_description:encryptField(description),p_category_id:categoryId,p_scope:transaction.scope,p_privacy:privacy,p_transaction_date:transactionDate});
  if(error)throw new Error(friendlyRpcError(error.message));

  // Simplest correct approach for a repeatable sub-list: replace the whole set rather than diff
  // it, same as update_financial_transaction already does for transaction_splits.
  let submittedItems:SubmittedItem[];
  try{submittedItems=JSON.parse(String(formData.get("items")??"[]"));}catch{submittedItems=[];}
  const validItems=submittedItems.flatMap(item=>{
    const trimmedDescription=item.description.trim();
    if(!trimmedDescription)return [];
    let itemAmountCents:number;
    try{itemAmountCents=eurosToCents(item.amount);}catch{return [];}
    return [{description:trimmedDescription,amount_cents:itemAmountCents,subcategory:normalizeItemSubcategory(item.subcategory)}];
  });
  const {error:deleteItemsError}=await supabase.from("transaction_items").delete().eq("transaction_id",id);
  if(deleteItemsError)throw new Error(deleteItemsError.message);
  if(validItems.length){
    const {error:insertItemsError}=await supabase.from("transaction_items").insert(validItems.map(item=>({transaction_id:id,description:encryptField(item.description),amount_cents:item.amount_cents,subcategory:item.subcategory})));
    if(insertItemsError)throw new Error(insertItemsError.message);
  }

  redirect(transaction.scope==="personal"?"/app/personal/movimientos":"/app/movimientos");
}
