"use server";
import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentHousehold } from "@/lib/household";
import { normalizeSpaceName } from "@/lib/settings/space-names";
import { createAdminClient } from "@/lib/supabase/admin";

export async function generateTelegramCode(){
  const {supabase,user}=await getCurrentHousehold(); const code=randomBytes(4).toString("hex").toUpperCase();
  await supabase.from("telegram_link_codes").delete().eq("user_id",user.id).is("used_at",null);
  const {error}=await supabase.from("telegram_link_codes").insert({user_id:user.id,code,expires_at:new Date(Date.now()+10*60*1000).toISOString()});
  if(error) throw new Error(error.message); revalidatePath("/app/ajustes");
}

export async function unlinkTelegram(){
  const {supabase,user}=await getCurrentHousehold();
  const {error}=await supabase.from("telegram_links").delete().eq("user_id",user.id);
  if(error) throw new Error(error.message); revalidatePath("/app/ajustes");
}

export async function generateHouseholdInvite(){
  const {supabase,user,household}=await getCurrentHousehold(); if(!household)throw new Error("No tienes un hogar activo.");
  if(household.role!=="owner")throw new Error("Solo la persona propietaria puede generar la invitación.");
  const code=randomBytes(4).toString("hex").toUpperCase();
  await supabase.from("household_invites").delete().eq("household_id",household.id).is("used_at",null);
  const {error}=await supabase.from("household_invites").insert({household_id:household.id,code,created_by:user.id,expires_at:new Date(Date.now()+7*24*60*60*1000).toISOString()});
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
  revalidatePath("/app","layout"); revalidatePath("/app/personal"); revalidatePath("/app/personal/movimientos"); revalidatePath("/app/personal/cuentas"); revalidatePath("/app/ajustes");
}

export async function leaveHousehold(){
  const {supabase}=await getCurrentHousehold();
  const {error}=await supabase.rpc("leave_household"); if(error)throw new Error(error.message);
  redirect("/onboarding");
}

export async function deleteAccount(){
  const {supabase,user}=await getCurrentHousehold();
  const {error:leaveError}=await supabase.rpc("leave_household"); if(leaveError)throw new Error(leaveError.message);
  await supabase.auth.signOut();
  const {error}=await createAdminClient().auth.admin.deleteUser(user.id); if(error)throw new Error(error.message);
  redirect(`/login?message=${encodeURIComponent("Tu cuenta fue eliminada correctamente.")}`);
}
