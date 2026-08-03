"use server";
import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getCurrentHousehold } from "@/lib/household";

export async function generateTelegramCode(){
  const {supabase,user}=await getCurrentHousehold(); const code=randomBytes(4).toString("hex").toUpperCase();
  await supabase.from("telegram_link_codes").delete().eq("user_id",user.id).is("used_at",null);
  const {error}=await supabase.from("telegram_link_codes").insert({user_id:user.id,code,expires_at:new Date(Date.now()+10*60*1000).toISOString()});
  if(error) throw new Error(error.message); revalidatePath("/app/ajustes");
}
