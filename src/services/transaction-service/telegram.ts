import type { SupabaseClient } from "@supabase/supabase-js";
import type { FinancialAction } from "@/services/financial-message-parser/schema";
import { formatMoney } from "@/lib/finance/money";

export async function executeTelegramAction(db: SupabaseClient, userId:string, householdId:string, action:FinancialAction) {
  if(action.action!=="create_transaction") throw new Error("Esta acción necesita confirmación o un flujo específico");
  const categoryName=action.data.category.replace(/[%_]/g,"");
  const {data:category}=await db.from("categories").select("id,name,kind").ilike("name",categoryName).eq("kind",action.data.type).or(`household_id.eq.${householdId},household_id.is.null`).limit(1).maybeSingle();
  let accountQuery=db.from("accounts").select("id,name").eq("household_id",householdId).is("archived_at",null);
  accountQuery=action.data.scope==="shared"?accountQuery.eq("is_shared",true):accountQuery.eq("is_shared",false).eq("owner_user_id",userId);
  if(action.data.account_name){const safeName=action.data.account_name.replace(/[%_]/g,"");accountQuery=accountQuery.ilike("name",`%${safeName}%`)}
  const {data:accounts,error:accountError}=await accountQuery.order("created_at").limit(2); if(accountError)throw accountError;
  if(!category||!accounts?.length)throw new Error(action.data.scope==="personal"?"No encuentro una cuenta personal. Créala primero en Mi espacio personal.":"No encuentro una categoría o cuenta conjunta válida; registra el movimiento desde la web.");
  if(accounts.length>1)throw new Error(`Indica qué cuenta quieres usar: ${accounts.map(account=>account.name).join(" o ")}.`);
  const account=accounts[0];
  const {error}=await db.rpc("create_financial_transaction_as_user",{p_actor_user_id:userId,p_household_id:householdId,p_account_id:account.id,p_type:action.data.type,p_amount_cents:action.data.amount_cents,p_description:action.data.description,p_category_id:category.id,p_scope:action.data.scope,p_privacy:action.data.privacy,p_transaction_date:action.data.transaction_date,p_paid_by:userId,p_source:"telegram"});
  if(error)throw error;
  return `He registrado ${formatMoney(action.data.amount_cents)} en ${category.name} desde ${account.name}, como ${action.data.scope==="shared"?"compartido":"personal"}.`;
}
