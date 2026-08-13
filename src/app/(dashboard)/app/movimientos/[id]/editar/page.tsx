import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { getCurrentHousehold } from "@/lib/household";
import { editTransaction } from "./actions";
import { SubmitButton } from "@/components/ui/submit-button";
import { decryptField } from "@/lib/security/field-encryption";

type Row={id:string;description:string;amount_cents:number;type:string;scope:"shared"|"personal";privacy:string;transaction_date:string;account_id:string;category_id:string};
export default async function EditPage({params}:{params:Promise<{id:string}>}){
  const {id}=await params; const {supabase,user,household}=await getCurrentHousehold(); if(!household)return null;
  const {data}=await supabase.from("transactions").select("id,description,amount_cents,type,scope,privacy,transaction_date,account_id,category_id").eq("id",id).eq("created_by",user.id).eq("status","confirmed").maybeSingle();
  if(!data)notFound(); const row={...(data as Row),description:decryptField((data as Row).description)};
  let accountsQuery=supabase.from("accounts").select("id,name").eq("household_id",household.id).is("archived_at",null);
  accountsQuery=row.scope==="shared"?accountsQuery.eq("is_shared",true):accountsQuery.eq("is_shared",false).eq("owner_user_id",user.id);
  const [{data:accounts},{data:categories}]=await Promise.all([accountsQuery.order("name"),supabase.from("categories").select("id,name,kind").or(`household_id.eq.${household.id},household_id.is.null`).order("name")]);
  const returnTo=row.scope==="personal"?"/app/personal":"/app/movimientos";
  return <div className="mx-auto max-w-2xl"><Link href={returnTo} className="mb-5 flex items-center gap-2 text-sm font-bold"><ArrowLeft size={17}/>{row.scope==="personal"?"Mi espacio personal":"Movimientos"}</Link><h1 className="text-3xl font-black">Editar movimiento {row.scope==="personal"?"personal":"conjunto"}</h1><section className="card mt-7 p-6"><form action={editTransaction} className="space-y-4"><input type="hidden" name="id" value={id}/><label><span className="label">Descripción</span><input className="field" name="description" defaultValue={row.description} required/></label><div className="grid grid-cols-2 gap-3"><label><span className="label">Importe</span><input className="field" name="amount" defaultValue={(row.amount_cents/100).toFixed(2).replace(".",",")} required/></label><label><span className="label">Fecha</span><input className="field" type="date" name="transactionDate" defaultValue={row.transaction_date} required/></label></div><div className="grid grid-cols-2 gap-3"><label><span className="label">Cuenta</span><select className="field" name="accountId" defaultValue={row.account_id}>{(accounts??[]).map(account=><option value={account.id} key={account.id}>{account.name}</option>)}</select></label><label><span className="label">Categoría</span><select className="field" name="categoryId" defaultValue={row.category_id}>{(categories??[]).filter(category=>category.kind===row.type).map(category=><option value={category.id} key={category.id}>{category.name}</option>)}</select></label></div><p className="rounded-sm bg-[#ffff50] p-3 text-sm">El ámbito {row.scope==="personal"?"personal y privado":"conjunto y visible"} se conserva al editar.</p><SubmitButton>Guardar cambios</SubmitButton></form></section></div>;
}
