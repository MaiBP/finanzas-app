"use server";
import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentHousehold } from "@/lib/household";
import { normalizeSpaceName } from "@/lib/settings/space-names";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseCurrency } from "@/lib/finance/currencies";
import { getStripeClient } from "@/lib/stripe/client";
import { getAppUrl } from "@/lib/env";

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
  const {count}=await supabase.from("household_members").select("*",{count:"exact",head:true}).eq("household_id",household.id);
  if((count??0)>=2)throw new Error("Tu hogar ya tiene el máximo de 2 personas.");
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

// Preference only — decides which currency the personal summary treats as "home". Accounts in
// another currency simply stay out of that summary's totals; nothing here converts anything.
export async function updatePersonalBaseCurrency(formData:FormData){
  const {supabase,user}=await getCurrentHousehold(); const personal_base_currency=parseCurrency(formData.get("currency"));
  const {error}=await supabase.from("profiles").update({personal_base_currency}).eq("id",user.id); if(error)throw new Error(error.message);
  revalidatePath("/app","layout"); revalidatePath("/app/personal"); revalidatePath("/app/personal/movimientos"); revalidatePath("/app/personal/cuentas"); revalidatePath("/app/ajustes");
}

export async function updateHouseholdBaseCurrency(formData:FormData){
  const {supabase,household}=await getCurrentHousehold(); if(!household)throw new Error("No tienes un hogar activo.");
  if(household.role!=="owner")throw new Error("Solo la persona propietaria puede cambiar la moneda base del hogar.");
  const base_currency=parseCurrency(formData.get("currency"));
  const {error}=await supabase.from("households").update({base_currency}).eq("id",household.id); if(error)throw new Error(error.message);
  revalidatePath("/app","layout"); revalidatePath("/app/movimientos"); revalidatePath("/app/cuentas"); revalidatePath("/app/ajustes");
}

// leave_household()'s SQL cascade-deletes the household row once the last member departs, taking
// stripe_subscription_id down with it — this is the last point where the app still knows which
// subscription that was, so it's the last chance to actually cancel it in Stripe. Without this, a
// paying household's last member leaving (or deleting their account) would keep getting billed
// forever with no household left in the app to ever cancel it from again.
async function cancelSubscriptionBeforeLastMemberLeaves(supabase:Awaited<ReturnType<typeof getCurrentHousehold>>["supabase"],householdId:string|null){
  if(!householdId)return;
  const [{count},{data:row}]=await Promise.all([
    supabase.from("household_members").select("*",{count:"exact",head:true}).eq("household_id",householdId),
    supabase.from("households").select("stripe_subscription_id").eq("id",householdId).maybeSingle(),
  ]);
  if((count??0)>1||!row?.stripe_subscription_id)return;
  const stripe=getStripeClient(); if(!stripe)return;
  await stripe.subscriptions.cancel(row.stripe_subscription_id).catch(error=>console.error("No se pudo cancelar la suscripción de Stripe al salir del hogar",error));
}

export async function leaveHousehold(){
  const {supabase,household}=await getCurrentHousehold();
  await cancelSubscriptionBeforeLastMemberLeaves(supabase,household?.id??null);
  const {error}=await supabase.rpc("leave_household"); if(error)throw new Error(error.message);
  redirect("/onboarding");
}

export async function createCheckoutSession(){
  const {supabase,user,household}=await getCurrentHousehold(); if(!household)throw new Error("No tienes un hogar activo.");
  // past_due already has a real Stripe subscription that just needs its payment fixed — sending it
  // through Checkout again would create a second, duplicate subscription instead of resolving the
  // existing one. The Billing Portal is where that gets fixed.
  if(household.subscriptionStatus==="past_due") return openBillingPortal();
  const stripe=getStripeClient(); const priceId=process.env.STRIPE_PRICE_ID;
  if(!stripe||!priceId)throw new Error("La suscripción todavía no está disponible.");
  const {data:row}=await supabase.from("households").select("stripe_customer_id").eq("id",household.id).maybeSingle();
  let customerId=row?.stripe_customer_id??null;
  // A stored customer_id can outlive the Stripe account/mode it was created under (e.g. after
  // rotating from a test key to a live one) — Stripe then rejects it with "No such customer" at
  // checkout time instead of at save time, so it must be re-validated here, not just trusted.
  if(customerId){
    const stillExists=await stripe.customers.retrieve(customerId).then(customer=>!customer.deleted).catch(()=>false);
    if(!stillExists)customerId=null;
  }
  if(!customerId){
    const customer=await stripe.customers.create({email:user.email,metadata:{household_id:household.id}});
    customerId=customer.id;
    await supabase.from("households").update({stripe_customer_id:customerId}).eq("id",household.id);
  }
  const appUrl=getAppUrl();
  const session=await stripe.checkout.sessions.create({
    mode:"subscription",
    customer:customerId,
    client_reference_id:household.id,
    line_items:[{price:priceId,quantity:1}],
    success_url:`${appUrl}/app/ajustes?subscription=activated`,
    cancel_url:`${appUrl}/app/ajustes`,
  });
  if(!session.url)throw new Error("No se pudo iniciar el pago.");
  redirect(session.url);
}

export async function openBillingPortal(){
  const {supabase,household}=await getCurrentHousehold(); if(!household)throw new Error("No tienes un hogar activo.");
  const stripe=getStripeClient();
  if(!stripe)throw new Error("La suscripción todavía no está disponible.");
  const {data:row}=await supabase.from("households").select("stripe_customer_id").eq("id",household.id).maybeSingle();
  if(!row?.stripe_customer_id)throw new Error("Todavía no tienes una suscripción activa.");
  const appUrl=getAppUrl();
  const session=await stripe.billingPortal.sessions.create({customer:row.stripe_customer_id,return_url:`${appUrl}/app/ajustes`})
    .catch(()=>{throw new Error("No encontramos tu suscripción en Stripe. Escribinos desde Contacto para resolverlo.");});
  redirect(session.url);
}

export async function deleteAccount(){
  const {supabase,user,household}=await getCurrentHousehold();
  await cancelSubscriptionBeforeLastMemberLeaves(supabase,household?.id??null);
  const {error:leaveError}=await supabase.rpc("leave_household"); if(leaveError)throw new Error(leaveError.message);
  await supabase.auth.signOut();
  const {error}=await createAdminClient().auth.admin.deleteUser(user.id); if(error)throw new Error(error.message);
  redirect(`/login?message=${encodeURIComponent("Tu cuenta fue eliminada correctamente.")}`);
}
