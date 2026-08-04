import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidWebhookSecret } from "@/lib/telegram/security";
import { sendTelegramMessage } from "@/lib/telegram/api";
import { parseFinancialMessage } from "@/services/financial-message-parser";
import { financialActionSchema, type FinancialAction } from "@/services/financial-message-parser/schema";
import { executeTelegramAction } from "@/services/transaction-service/telegram";
import { accountSelectionQuestion, accountsForAction, assignOnlyAccount, matchAccountSelection, type AccountOption, type CreateTransactionAction } from "@/services/transaction-service/account-selection";
import { getMonthSummary, getRecentTransactions } from "@/services/query-service";

const updateSchema=z.object({message:z.object({chat:z.object({id:z.number()}),from:z.object({id:z.number()}),text:z.string().max(2000)}).optional()});
const yes=/^(sí|si|confirmo|correcto|vale|ok)$/i; const no=/^(no|cancelar|cancela)$/i;
const withWebSuggestion=(message:string)=>`${message}\n\nSi quieres revisar el detalle, ingresa a la web.\nEnlace: <a href="https://finanzas-app-six-kappa.vercel.app/">https://finanzas-app-six-kappa.vercel.app/</a>`;

async function queueAction(db:ReturnType<typeof createAdminClient>,userId:string,householdId:string,action:FinancialAction){
  await db.from("pending_actions").delete().eq("user_id",userId);
  const {error}=await db.from("pending_actions").insert({user_id:userId,household_id:householdId,action_type:action.action,payload:action,expires_at:new Date(Date.now()+10*60*1000).toISOString()});
  if(error)throw error;
}

async function getAccountsForAction(db:ReturnType<typeof createAdminClient>,userId:string,householdId:string,action:CreateTransactionAction){
  let query=db.from("accounts").select("name,is_shared").eq("household_id",householdId).neq("type","joint").is("archived_at",null);
  query=action.data.scope==="shared"?query.eq("is_shared",true):query.eq("is_shared",false).eq("owner_user_id",userId);
  const {data,error}=await query.order("created_at"); if(error)throw error;
  return (data??[]) as AccountOption[];
}

async function handlePendingAccountSelection(db:ReturnType<typeof createAdminClient>,userId:string,householdId:string,text:string){
  const {data}=await db.from("pending_actions").select("id,payload").eq("user_id",userId).eq("household_id",householdId).eq("action_type","create_transaction").gt("expires_at",new Date().toISOString()).order("created_at",{ascending:false}).limit(1).maybeSingle();
  const parsed=financialActionSchema.safeParse(data?.payload); if(!data||!parsed.success||parsed.data.action!=="create_transaction"||parsed.data.data.account_name)return null;
  const accounts=await getAccountsForAction(db,userId,householdId,parsed.data); if(accounts.length<2)return null;
  const selected=matchAccountSelection(text,accounts); if(!selected)return null;
  const action={...parsed.data,data:{...parsed.data.data,account_name:selected.name}};
  if(action.requires_confirmation){const {error}=await db.from("pending_actions").update({payload:action}).eq("id",data.id);if(error)throw error;return `Usaré ${selected.name}. Responde “sí” para confirmar el movimiento o “no” para cancelar.`;}
  const reply=await executeTelegramAction(db,userId,householdId,action); await db.from("pending_actions").delete().eq("id",data.id); return reply;
}

async function confirmPending(db:ReturnType<typeof createAdminClient>,userId:string,householdId:string){
  const {data}=await db.from("pending_actions").select("id,payload").eq("user_id",userId).eq("household_id",householdId).gt("expires_at",new Date().toISOString()).order("created_at",{ascending:false}).limit(1).maybeSingle();
  if(!data)return "No hay ninguna acción pendiente o ya ha caducado.";
  let action=financialActionSchema.parse(data.payload); let reply:string;
  if(action.action==="create_transaction"){
    const accounts=await getAccountsForAction(db,userId,householdId,action); action=assignOnlyAccount(action,accounts);
    if(!action.data.account_name&&accounts.length>1)return accountSelectionQuestion(action,accounts);
    reply=await executeTelegramAction(db,userId,householdId,action);
  }
  else if(action.action==="delete_transaction"){
    let query=db.from("transactions").select("id,description").eq("household_id",householdId).eq("created_by",userId).eq("status","confirmed").order("created_at",{ascending:false});
    if(action.data.transaction_id)query=query.eq("id",action.data.transaction_id); else if(action.data.reference)query=query.ilike("description",`%${action.data.reference.replace(/[%_]/g,"")}%`);
    const {data:transaction}=await query.limit(1).maybeSingle(); if(!transaction)throw new Error("No encuentro un movimiento tuyo que coincida.");
    const {error}=await db.from("transactions").update({status:"deleted",deleted_at:new Date().toISOString()}).eq("id",transaction.id).eq("created_by",userId); if(error)throw error; reply=`He eliminado “${transaction.description}”.`;
  } else reply="Esta edición necesita hacerse desde la web por seguridad.";
  await db.from("pending_actions").delete().eq("id",data.id); return reply;
}

export async function POST(request:Request){
  if(!isValidWebhookSecret(request.headers.get("x-telegram-bot-api-secret-token"),process.env.TELEGRAM_WEBHOOK_SECRET))return NextResponse.json({error:"Unauthorized"},{status:401});
  const parsed=updateSchema.safeParse(await request.json().catch(()=>null)); if(!parsed.success||!parsed.data.message)return NextResponse.json({ok:true});
  const {chat,from,text:raw}=parsed.data.message; const text=raw.trim(); const db=createAdminClient();
  try{
    if(text.startsWith("/start")){await sendTelegramMessage(chat.id,"Hola 👋 Soy el asistente de A medias. Vincula tu cuenta desde Ajustes y envíame <code>/vincular CÓDIGO</code>.");return NextResponse.json({ok:true});}
    if(text.startsWith("/ayuda")){await sendTelegramMessage(chat.id,"Puedes decirme “Gasté 42 euros en Mercadona”, o usar /resumen, /ultimos y /cancelar.");return NextResponse.json({ok:true});}
    if(text.startsWith("/vincular")){const code=text.split(/\s+/)[1];if(!code){await sendTelegramMessage(chat.id,"Falta el código. Ejemplo: <code>/vincular ABC12345</code>");return NextResponse.json({ok:true});}const {error}=await db.rpc("link_telegram_account",{p_code:code,p_telegram_user_id:from.id,p_telegram_chat_id:chat.id});if(error)throw error;await sendTelegramMessage(chat.id,"¡Listo! Tu Telegram ya está vinculado con A medias.");return NextResponse.json({ok:true});}
    const {data:link}=await db.from("telegram_links").select("user_id").eq("telegram_user_id",from.id).maybeSingle();if(!link){await sendTelegramMessage(chat.id,"No reconozco esta cuenta. Genera un código en Ajustes y usa <code>/vincular CÓDIGO</code>.");return NextResponse.json({ok:true});}
    const {data:membership}=await db.from("household_members").select("household_id").eq("user_id",link.user_id).maybeSingle();if(!membership)throw new Error("Tu cuenta aún no pertenece a un hogar.");
    if(text==="/cancelar"||no.test(text)){await db.from("pending_actions").delete().eq("user_id",link.user_id);await sendTelegramMessage(chat.id,"Acción cancelada.");return NextResponse.json({ok:true});}
    const accountSelectionReply=await handlePendingAccountSelection(db,link.user_id,membership.household_id,text);if(accountSelectionReply){await db.from("conversation_messages").insert([{user_id:link.user_id,household_id:membership.household_id,role:"user",content:text},{user_id:link.user_id,household_id:membership.household_id,role:"assistant",content:accountSelectionReply}]);await sendTelegramMessage(chat.id,withWebSuggestion(accountSelectionReply));return NextResponse.json({ok:true});}
    if(yes.test(text)){await sendTelegramMessage(chat.id,withWebSuggestion(await confirmPending(db,link.user_id,membership.household_id)));return NextResponse.json({ok:true});}
    if(text==="/resumen"){await sendTelegramMessage(chat.id,withWebSuggestion(await getMonthSummary(db,membership.household_id,link.user_id)));return NextResponse.json({ok:true});}
    if(text==="/ultimos"){await sendTelegramMessage(chat.id,withWebSuggestion(await getRecentTransactions(db,membership.household_id,link.user_id)));return NextResponse.json({ok:true});}
    const [{data:categories},{data:accounts},{data:recent}]=await Promise.all([db.from("categories").select("name,kind").or(`household_id.eq.${membership.household_id},household_id.is.null`),db.from("accounts").select("name,is_shared").eq("household_id",membership.household_id).neq("type","joint").is("archived_at",null).or(`owner_user_id.eq.${link.user_id},is_shared.eq.true`),db.from("conversation_messages").select("role,content").eq("user_id",link.user_id).order("created_at",{ascending:false}).limit(6)]);
    await db.from("conversation_messages").insert({user_id:link.user_id,household_id:membership.household_id,role:"user",content:text});
    let action=await parseFinancialMessage({text,userId:link.user_id,householdId:membership.household_id,now:new Date().toISOString(),categories:categories??[],accounts:accounts??[],recentMessages:((recent??[]) as {role:"user"|"assistant";content:string}[]).reverse()});
    let reply:string;
    if(action.action==="request_clarification")reply=action.data.question;
    else if(action.action==="query_finances"){const scope=action.data.filters.scope??"combined";reply=action.data.query_type==="recent_transactions"?await getRecentTransactions(db,membership.household_id,link.user_id,5,scope):await getMonthSummary(db,membership.household_id,link.user_id,new Date(),scope);}
    else if(action.action==="cancel_action")reply="De acuerdo, no hago nada.";
    else if(action.action==="create_transaction"){
      const eligibleAccounts=accountsForAction(action,(accounts??[]) as AccountOption[]); action=assignOnlyAccount(action,eligibleAccounts);
      if(!action.data.account_name&&eligibleAccounts.length>1){await queueAction(db,link.user_id,membership.household_id,action);reply=accountSelectionQuestion(action,eligibleAccounts);}
      else if(!action.requires_confirmation&&action.confidence>=.85)reply=await executeTelegramAction(db,link.user_id,membership.household_id,action);
      else {await queueAction(db,link.user_id,membership.household_id,action);reply="Queda pendiente. Responde “sí” para confirmar o “no” para cancelar.";}
    }
    else {await queueAction(db,link.user_id,membership.household_id,action);reply=action.action==="delete_transaction"?"He encontrado la acción de borrado. Responde “sí” para confirmarla o “no” para cancelar.":"Queda pendiente. Responde “sí” para confirmar o “no” para cancelar.";}
    await db.from("conversation_messages").insert({user_id:link.user_id,household_id:membership.household_id,role:"assistant",content:reply});await sendTelegramMessage(chat.id,withWebSuggestion(reply));
  }catch(error){console.error("Telegram webhook error",error);const safeMessage=error instanceof Error&&error.message.startsWith("Indica qué cuenta")?error.message:"No he podido completar eso. Inténtalo de nuevo.";await sendTelegramMessage(chat.id,withWebSuggestion(safeMessage)).catch(()=>undefined);}
  return NextResponse.json({ok:true});
}
