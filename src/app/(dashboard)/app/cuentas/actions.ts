"use server";
import { revalidatePath } from "next/cache";
import { getCurrentHousehold } from "@/lib/household";
import { calculateBaseForTargetBalance } from "@/lib/finance/account-overview";

const accountTypes=["bank","card","cash","savings","investment"] as const;

function parseAccount(formData:FormData){
  const name=String(formData.get("name")??"").trim(); const type=String(formData.get("type"));
  if(name.length<1||name.length>80||!accountTypes.includes(type as typeof accountTypes[number]))throw new Error("Datos de cuenta no válidos");
  let balance=0; const raw=String(formData.get("balance")??"").trim(); if(raw) balance=parseSignedEuros(raw);
  return {name,type,balance};
}

function parseSignedEuros(rawValue: FormDataEntryValue | null) {
  const raw = String(rawValue ?? "").trim();
  if (!raw) throw new Error("Indica el saldo actual");
  const negative = raw.startsWith("-");
  const normalized = (negative ? raw.slice(1) : raw).replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) throw new Error("Saldo no válido");
  const cents = Math.round(Number(normalized) * 100);
  if (!Number.isSafeInteger(cents)) throw new Error("Saldo no válido");
  return cents * (negative ? -1 : 1);
}

export async function createAccount(formData:FormData){
  const {supabase,user,household}=await getCurrentHousehold(); if(!household)throw new Error("Sin hogar"); const {name,type,balance}=parseAccount(formData);
  const {error}=await supabase.from("accounts").insert({household_id:household.id,owner_user_id:user.id,name,type,currency:"EUR",current_balance_cents:balance,is_shared:false}); if(error)throw new Error(error.message); revalidatePath("/app/personal");
}

export async function createSharedAccount(formData:FormData){
  const {supabase,household}=await getCurrentHousehold(); if(!household)throw new Error("Sin hogar"); const {name,type,balance}=parseAccount(formData);
  const {error}=await supabase.from("accounts").insert({household_id:household.id,owner_user_id:null,name,type,currency:"EUR",current_balance_cents:balance,is_shared:true}); if(error)throw new Error(error.message); revalidatePath("/app/cuentas"); revalidatePath("/app/movimientos/nuevo");
}

export async function updateSharedAccount(formData: FormData) {
  const { supabase, household } = await getCurrentHousehold();
  if (!household) throw new Error("Sin hogar");
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "");
  if (!id || name.length < 1 || name.length > 80 || !accountTypes.includes(type as typeof accountTypes[number])) {
    throw new Error("Datos de cuenta no válidos");
  }
  const targetBalance = parseSignedEuros(formData.get("balance"));
  const [{ data: account, error: accountError }, { data: movements, error: movementError }] = await Promise.all([
    supabase.from("accounts").select("id").eq("id", id).eq("household_id", household.id).eq("is_shared", true).neq("type", "joint").is("archived_at", null).maybeSingle(),
    supabase.from("transactions").select("account_id,type,amount_cents").eq("account_id", id).eq("household_id", household.id).eq("scope", "shared").eq("status", "confirmed"),
  ]);
  if (accountError || movementError) throw new Error(accountError?.message ?? movementError?.message);
  if (!account) throw new Error("Cuenta no encontrada");
  const current_balance_cents = calculateBaseForTargetBalance(targetBalance, id, (movements ?? []) as { account_id: string; type: "expense" | "income"; amount_cents: number }[]);
  const { error } = await supabase.from("accounts").update({ name, type, current_balance_cents }).eq("id", id).eq("household_id", household.id).eq("is_shared", true);
  if (error) throw new Error(error.message);
  revalidatePath("/app");
  revalidatePath("/app/cuentas");
  revalidatePath("/app/movimientos");
  revalidatePath("/app/movimientos/nuevo");
}

export async function archiveAccount(formData:FormData){
  const {supabase,user}=await getCurrentHousehold(); const {error}=await supabase.from("accounts").update({archived_at:new Date().toISOString()}).eq("id",String(formData.get("id"))).eq("owner_user_id",user.id); if(error)throw new Error(error.message); revalidatePath("/app/personal");
}

export async function archiveSharedAccount(formData:FormData){
  const {supabase,household}=await getCurrentHousehold(); if(!household)throw new Error("Sin hogar");
  const {count}=await supabase.from("accounts").select("id",{count:"exact",head:true}).eq("household_id",household.id).eq("is_shared",true).neq("type","joint").is("archived_at",null); if((count??0)<=1)throw new Error("El hogar debe conservar al menos una cuenta operativa activa.");
  const {error}=await supabase.from("accounts").update({archived_at:new Date().toISOString()}).eq("id",String(formData.get("id"))).eq("household_id",household.id).eq("is_shared",true); if(error)throw new Error(error.message); revalidatePath("/app/cuentas"); revalidatePath("/app/movimientos/nuevo");
}
