"use server";
import { revalidatePath } from "next/cache";
import { getCurrentHousehold } from "@/lib/household";
import { eurosToCents } from "@/lib/finance/money";

export async function createAccount(formData:FormData){const {supabase,user,household}=await getCurrentHousehold();if(!household)throw new Error("Sin hogar");const name=String(formData.get("name")??"").trim();const type=String(formData.get("type"));if(name.length<1||name.length>80||!["bank","card","cash","savings"].includes(type))throw new Error("Datos de cuenta no válidos");let balance=0;const raw=String(formData.get("balance")??"").trim();if(raw){const negative=raw.startsWith("-");balance=eurosToCents(negative?raw.slice(1):raw)*(negative?-1:1)}const {error}=await supabase.from("accounts").insert({household_id:household.id,owner_user_id:user.id,name,type,currency:"EUR",current_balance_cents:balance,is_shared:false});if(error)throw new Error(error.message);revalidatePath("/app/cuentas")}
export async function archiveAccount(formData:FormData){const {supabase,user}=await getCurrentHousehold();const {error}=await supabase.from("accounts").update({archived_at:new Date().toISOString()}).eq("id",String(formData.get("id"))).eq("owner_user_id",user.id);if(error)throw new Error(error.message);revalidatePath("/app/cuentas")}
