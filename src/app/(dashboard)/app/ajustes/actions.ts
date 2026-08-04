"use server";
import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getCurrentHousehold } from "@/lib/household";
import { normalizeSpaceName } from "@/lib/settings/space-names";

export async function generateTelegramCode(){
  const {supabase,user}=await getCurrentHousehold(); const code=randomBytes(4).toString("hex").toUpperCase();
  await supabase.from("telegram_link_codes").delete().eq("user_id",user.id).is("used_at",null);
  const {error}=await supabase.from("telegram_link_codes").insert({user_id:user.id,code,expires_at:new Date(Date.now()+10*60*1000).toISOString()});
  if(error) throw new Error(error.message); revalidatePath("/app/ajustes");
}

export async function updateHouseholdName(formData:FormData){
  const {supabase,household}=await getCurrentHousehold(); if(!household)throw new Error("No tienes un hogar activo.");
  if(household.role!=="owner")throw new Error("Solo la persona propietaria puede cambiar el nombre del hogar.");
  const name=normalizeSpaceName(formData.get("name"),80); const {error}=await supabase.from("households").update({name}).eq("id",household.id); if(error)throw new Error(error.message);
  revalidatePath("/app","layout");
}

export async function updatePersonalSpaceName(formData:FormData){
  const {supabase,user}=await getCurrentHousehold(); const personal_space_name=normalizeSpaceName(formData.get("name"),50);
  const {error}=await supabase.from("profiles").update({personal_space_name}).eq("id",user.id); if(error)throw new Error(error.message);
  revalidatePath("/app","layout"); revalidatePath("/app/personal"); revalidatePath("/app/ajustes");
}
