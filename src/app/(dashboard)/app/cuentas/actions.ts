"use server";
import { revalidatePath } from "next/cache";
import { getCurrentHousehold } from "@/lib/household";
import { calculateAccountBalance } from "@/lib/finance/account-overview";
import { eurosToCentsSigned, formatMoney } from "@/lib/finance/money";
import { notifyOtherMembers } from "@/services/telegram-notify";
import { decryptField, encryptField } from "@/lib/security/field-encryption";
import { SYNTHETIC_BALANCE_CATEGORY } from "@/lib/finance/synthetic-transactions";

async function actorName(supabase: Awaited<ReturnType<typeof getCurrentHousehold>>["supabase"], userId: string) {
  const { data } = await supabase.from("profiles").select("display_name").eq("id", userId).maybeSingle();
  return data?.display_name ? decryptField(data.display_name) : "Tu pareja";
}

const accountTypes=["bank","card","cash","savings","investment"] as const;

function parseAccount(formData:FormData){
  const name=String(formData.get("name")??"").trim(); const type=String(formData.get("type"));
  if(name.length<1||name.length>80||!accountTypes.includes(type as typeof accountTypes[number]))throw new Error("Datos de cuenta no válidos");
  return {name,type};
}

export async function createAccount(formData:FormData){
  const {supabase,user,household}=await getCurrentHousehold(); if(!household)throw new Error("Sin hogar"); const {name,type}=parseAccount(formData);
  const initialBalanceText=String(formData.get("initialBalance")??"").trim();
  const initialCents=initialBalanceText?eurosToCentsSigned(initialBalanceText):0;
  const {data:account,error}=await supabase.from("accounts").insert({household_id:household.id,owner_user_id:user.id,name,type,currency:"EUR",current_balance_cents:0,is_shared:false}).select("id").single();
  if(error)throw new Error(error.message);
  if(initialCents!==0){
    const txType=initialCents>0?"income":"expense";
    const {data:category,error:categoryError}=await supabase.from("categories").select("id").eq("name",SYNTHETIC_BALANCE_CATEGORY).eq("kind",txType).or(`household_id.eq.${household.id},household_id.is.null`).limit(1).maybeSingle();
    if(categoryError)throw new Error(categoryError.message);
    if(!category)throw new Error(`Falta la categoría «${SYNTHETIC_BALANCE_CATEGORY}». Aplica la migración correspondiente.`);
    const {error:txError}=await supabase.rpc("create_financial_transaction",{
      p_household_id:household.id,
      p_account_id:account.id,
      p_type:txType,
      p_amount_cents:Math.abs(initialCents),
      p_description:encryptField(`Nueva cuenta creada: ${name}`),
      p_category_id:category.id,
      p_scope:"personal",
      p_privacy:"private",
      p_transaction_date:new Date().toISOString().slice(0,10),
      p_paid_by:user.id,
    });
    if(txError)throw new Error(txError.message);
  }
  revalidatePath("/app/personal");
}

export async function updateAccount(formData:FormData){
  const {supabase,user}=await getCurrentHousehold();
  const id=String(formData.get("id")??"");
  const name=String(formData.get("name")??"").trim();
  const type=String(formData.get("type")??"");
  if(!id||name.length<1||name.length>80||!accountTypes.includes(type as typeof accountTypes[number])){
    throw new Error("Datos de cuenta no válidos");
  }
  const {data:account,error:accountError}=await supabase.from("accounts").select("id").eq("id",id).eq("owner_user_id",user.id).eq("is_shared",false).is("archived_at",null).maybeSingle();
  if(accountError)throw new Error(accountError.message);
  if(!account)throw new Error("Cuenta no encontrada");
  const {error}=await supabase.from("accounts").update({name,type,current_balance_cents:0}).eq("id",id).eq("owner_user_id",user.id);
  if(error)throw new Error(error.message);
  revalidatePath("/app/personal");
}

export async function adjustAccountBalance(formData:FormData){
  const {supabase,user,household}=await getCurrentHousehold(); if(!household)throw new Error("Sin hogar");
  const id=String(formData.get("id")??"");
  if(!id)throw new Error("Cuenta no válida");
  const {data:account,error:accountError}=await supabase.from("accounts").select("id,name").eq("id",id).eq("owner_user_id",user.id).eq("is_shared",false).is("archived_at",null).maybeSingle();
  if(accountError)throw new Error(accountError.message);
  if(!account)throw new Error("Cuenta no encontrada");

  const targetCents=eurosToCentsSigned(String(formData.get("targetBalance")??""));

  const {data:movementsData,error:movementsError}=await supabase.from("transactions").select("account_id,type,amount_cents").eq("household_id",household.id).eq("account_id",id).eq("scope","personal").eq("created_by",user.id).eq("status","confirmed");
  if(movementsError)throw new Error(movementsError.message);
  const currentBalance=calculateAccountBalance(id,movementsData??[]);
  const delta=targetCents-currentBalance;
  if(delta===0)return;

  const type=delta>0?"income":"expense";
  const {data:category,error:categoryError}=await supabase.from("categories").select("id").eq("name",SYNTHETIC_BALANCE_CATEGORY).eq("kind",type).or(`household_id.eq.${household.id},household_id.is.null`).limit(1).maybeSingle();
  if(categoryError)throw new Error(categoryError.message);
  if(!category)throw new Error(`Falta la categoría «${SYNTHETIC_BALANCE_CATEGORY}». Aplica la migración correspondiente.`);

  const {error}=await supabase.rpc("create_financial_transaction",{
    p_household_id:household.id,
    p_account_id:id,
    p_type:type,
    p_amount_cents:Math.abs(delta),
    p_description:encryptField(SYNTHETIC_BALANCE_CATEGORY),
    p_category_id:category.id,
    p_scope:"personal",
    p_privacy:"private",
    p_transaction_date:new Date().toISOString().slice(0,10),
    p_paid_by:user.id,
  });
  if(error)throw new Error(error.message);
  revalidatePath("/app/personal");
}

export async function createSharedAccount(formData:FormData){
  const {supabase,user,household}=await getCurrentHousehold(); if(!household)throw new Error("Sin hogar"); const {name,type}=parseAccount(formData);
  const initialBalanceText=String(formData.get("initialBalance")??"").trim();
  const initialCents=initialBalanceText?eurosToCentsSigned(initialBalanceText):0;
  const {data:account,error}=await supabase.from("accounts").insert({household_id:household.id,owner_user_id:null,name,type,currency:"EUR",current_balance_cents:0,is_shared:true}).select("id").single();
  if(error)throw new Error(error.message);
  if(initialCents!==0){
    const txType=initialCents>0?"income":"expense";
    const {data:category,error:categoryError}=await supabase.from("categories").select("id").eq("name",SYNTHETIC_BALANCE_CATEGORY).eq("kind",txType).or(`household_id.eq.${household.id},household_id.is.null`).limit(1).maybeSingle();
    if(categoryError)throw new Error(categoryError.message);
    if(!category)throw new Error(`Falta la categoría «${SYNTHETIC_BALANCE_CATEGORY}». Aplica la migración correspondiente.`);
    const {error:txError}=await supabase.rpc("create_financial_transaction",{
      p_household_id:household.id,
      p_account_id:account.id,
      p_type:txType,
      p_amount_cents:Math.abs(initialCents),
      p_description:encryptField(`Nueva cuenta creada: ${name}`),
      p_category_id:category.id,
      p_scope:"shared",
      p_privacy:"visible",
      p_transaction_date:new Date().toISOString().slice(0,10),
      p_paid_by:user.id,
    });
    if(txError)throw new Error(txError.message);
  }
  const actor=await actorName(supabase,user.id);
  const balanceNote=initialCents!==0?` (saldo inicial ${formatMoney(Math.abs(initialCents))})`:"";
  await notifyOtherMembers(household.id,user.id,`🏦 ${actor} creó una cuenta nueva: ${name}${balanceNote}.`);
  revalidatePath("/app"); revalidatePath("/app/cuentas"); revalidatePath("/app/movimientos"); revalidatePath("/app/movimientos/nuevo");
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
  const { data: account, error: accountError } = await supabase.from("accounts").select("id").eq("id", id).eq("household_id", household.id).eq("is_shared", true).neq("type", "joint").is("archived_at", null).maybeSingle();
  if (accountError) throw new Error(accountError.message);
  if (!account) throw new Error("Cuenta no encontrada");
  const { error } = await supabase.from("accounts").update({ name, type, current_balance_cents: 0 }).eq("id", id).eq("household_id", household.id).eq("is_shared", true);
  if (error) throw new Error(error.message);
  revalidatePath("/app");
  revalidatePath("/app/cuentas");
  revalidatePath("/app/movimientos");
  revalidatePath("/app/movimientos/nuevo");
}

export async function archiveAccount(formData:FormData){
  const {supabase,user}=await getCurrentHousehold(); const {error}=await supabase.from("accounts").update({archived_at:new Date().toISOString()}).eq("id",String(formData.get("id"))).eq("owner_user_id",user.id); if(error)throw new Error(error.message); revalidatePath("/app/personal");
}

export async function adjustSharedAccountBalance(formData: FormData) {
  const { supabase, user, household } = await getCurrentHousehold();
  if (!household) throw new Error("Sin hogar");
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Cuenta no válida");
  const { data: account, error: accountError } = await supabase.from("accounts").select("id,name").eq("id", id).eq("household_id", household.id).eq("is_shared", true).neq("type", "joint").is("archived_at", null).maybeSingle();
  if (accountError) throw new Error(accountError.message);
  if (!account) throw new Error("Cuenta no encontrada");

  const targetCents = eurosToCentsSigned(String(formData.get("targetBalance") ?? ""));

  const { data: movementsData, error: movementsError } = await supabase.from("transactions").select("account_id,type,amount_cents").eq("household_id", household.id).eq("account_id", id).eq("scope", "shared").eq("status", "confirmed");
  if (movementsError) throw new Error(movementsError.message);
  const currentBalance = calculateAccountBalance(id, movementsData ?? []);
  const delta = targetCents - currentBalance;
  if (delta === 0) return;

  const type = delta > 0 ? "income" : "expense";
  const { data: category, error: categoryError } = await supabase.from("categories").select("id").eq("name", SYNTHETIC_BALANCE_CATEGORY).eq("kind", type).or(`household_id.eq.${household.id},household_id.is.null`).limit(1).maybeSingle();
  if (categoryError) throw new Error(categoryError.message);
  if (!category) throw new Error(`Falta la categoría «${SYNTHETIC_BALANCE_CATEGORY}». Aplica la migración correspondiente.`);

  const { error } = await supabase.rpc("create_financial_transaction", {
    p_household_id: household.id,
    p_account_id: id,
    p_type: type,
    p_amount_cents: Math.abs(delta),
    p_description: encryptField(SYNTHETIC_BALANCE_CATEGORY),
    p_category_id: category.id,
    p_scope: "shared",
    p_privacy: "visible",
    p_transaction_date: new Date().toISOString().slice(0, 10),
    p_paid_by: user.id,
  });
  if (error) throw new Error(error.message);
  const actor = await actorName(supabase, user.id);
  await notifyOtherMembers(household.id, user.id, `⚖️ ${actor} ajustó el saldo de ${account.name} a ${formatMoney(targetCents)}.`);
  revalidatePath("/app");
  revalidatePath("/app/cuentas");
  revalidatePath("/app/movimientos");
}

export async function archiveSharedAccount(formData:FormData){
  const {supabase,household}=await getCurrentHousehold(); if(!household)throw new Error("Sin hogar");
  const {count}=await supabase.from("accounts").select("id",{count:"exact",head:true}).eq("household_id",household.id).eq("is_shared",true).neq("type","joint").is("archived_at",null); if((count??0)<=1)throw new Error("El hogar debe conservar al menos una cuenta operativa activa.");
  const {error}=await supabase.from("accounts").update({archived_at:new Date().toISOString()}).eq("id",String(formData.get("id"))).eq("household_id",household.id).eq("is_shared",true); if(error)throw new Error(error.message); revalidatePath("/app/cuentas"); revalidatePath("/app/movimientos/nuevo");
}
