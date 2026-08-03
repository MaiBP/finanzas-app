"use server";
import { getCurrentHousehold } from "@/lib/household";
import { parseFinancialMessage } from "@/services/financial-message-parser";
import { getMonthSummary, getRecentTransactions } from "@/services/query-service";

export type AssistantState={reply?:string;error?:string};
export async function askAssistant(_state:AssistantState,formData:FormData):Promise<AssistantState>{
  const text=String(formData.get("message")??"").trim();if(text.length<2)return{error:"Escribe una pregunta un poco más concreta."};
  const {supabase,user,household}=await getCurrentHousehold();if(!household)return{error:"No tienes un hogar activo."};
  try{const [{data:categories},{data:accounts}]=await Promise.all([supabase.from("categories").select("name,kind").or(`household_id.eq.${household.id},household_id.is.null`),supabase.from("accounts").select("name").eq("household_id",household.id).is("archived_at",null)]);const action=await parseFinancialMessage({text,userId:user.id,householdId:household.id,now:new Date().toISOString(),categories:categories??[],accounts:accounts??[],recentMessages:[]});
    if(action.action==="query_finances")return{reply:action.data.query_type==="recent_transactions"?await getRecentTransactions(supabase,household.id):await getMonthSummary(supabase,household.id)};
    if(action.action==="request_clarification")return{reply:action.data.question};
    return{reply:"He entendido una acción sobre un movimiento. Por ahora, confírmala desde Movimientos o envíala al bot de Telegram."};
  }catch(error){return{error:error instanceof Error?error.message:"No se pudo consultar el asistente."};}
}
