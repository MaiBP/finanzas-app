import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidWebhookSecret } from "@/lib/telegram/security";
import { downloadTelegramFile, MAX_TELEGRAM_IMPORT_BYTES, sendTelegramMessage, withTelegramWebSuggestion } from "@/lib/telegram/api";
import { parseFinancialMessage } from "@/services/financial-message-parser";
import { financialActionSchema, type FinancialAction } from "@/services/financial-message-parser/schema";
import { executeTelegramAction } from "@/services/transaction-service/telegram";
import { accountSelectionQuestion, accountsForAction, assignOnlyAccount, matchAccountSelection, type AccountOption, type CreateTransactionAction } from "@/services/transaction-service/account-selection";
import { getMonthSummary, getRecentTransactions } from "@/services/query-service";
import { executeStatementImport, extractStatementTransactions, isPersonalStatementImport, isSupportedStatementFile, statementImportPayloadSchema, statementPreview } from "@/services/statement-import";

export const maxDuration=60;

const telegramFileSchema=z.object({file_id:z.string(),file_unique_id:z.string(),file_name:z.string().max(180).optional(),mime_type:z.string().max(100).optional(),file_size:z.number().nonnegative().optional()});
const telegramPhotoSchema=z.object({file_id:z.string(),file_unique_id:z.string(),file_size:z.number().nonnegative().optional(),width:z.number().optional(),height:z.number().optional()});
const updateSchema=z.object({message:z.object({chat:z.object({id:z.number()}),from:z.object({id:z.number()}),text:z.string().max(2000).optional(),caption:z.string().max(2000).optional(),document:telegramFileSchema.optional(),photo:z.array(telegramPhotoSchema).optional()}).optional()});
const yes=/^(sí|si|confirmo|correcto|vale|ok)$/i; const no=/^(no|cancelar|cancela)$/i;

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

async function getImportAccounts(db:ReturnType<typeof createAdminClient>,userId:string,householdId:string,scope:"shared"|"personal"){
  let query=db.from("accounts").select("name,is_shared").eq("household_id",householdId).neq("type","joint").is("archived_at",null);
  query=scope==="shared"?query.eq("is_shared",true):query.eq("is_shared",false).eq("owner_user_id",userId);
  const {data,error}=await query.order("created_at");if(error)throw error;return (data??[]) as AccountOption[];
}

async function handlePendingImportAccountSelection(db:ReturnType<typeof createAdminClient>,userId:string,householdId:string,text:string){
  const {data}=await db.from("pending_actions").select("id,payload").eq("user_id",userId).eq("household_id",householdId).eq("action_type","import_statement").gt("expires_at",new Date().toISOString()).order("created_at",{ascending:false}).limit(1).maybeSingle();
  const parsed=statementImportPayloadSchema.safeParse(data?.payload);if(!data||!parsed.success||parsed.data.account_name)return null;
  const accounts=await getImportAccounts(db,userId,householdId,parsed.data.scope);const selected=matchAccountSelection(text,accounts);
  if(!selected)return `Antes de importar, elige una cuenta:\n${accounts.map((account,index)=>`${index+1}. ${account.name}`).join("\n")}\nResponde con el número o el nombre.`;
  const payload={...parsed.data,account_name:selected.name};const {error}=await db.from("pending_actions").update({payload}).eq("id",data.id);if(error)throw error;
  return `Usaré ${selected.name} para los ${payload.transactions.length} movimientos. Responde “sí” para registrar todo o “no” para cancelar.`;
}

async function handleStatementAttachment(db:ReturnType<typeof createAdminClient>,message:NonNullable<z.infer<typeof updateSchema>["message"]>,userId:string,householdId:string){
  const photo=message.photo?.at(-1);const attachment=message.document??photo;if(!attachment)return null;
  const fileName=message.document?.file_name??"resumen.jpg";const mimeType=message.document?.mime_type??"image/jpeg";const caption=message.caption??"";
  if((attachment.file_size??0)>MAX_TELEGRAM_IMPORT_BYTES)throw new Error("IMPORT_USER:El archivo supera el límite de 12 MB.");
  if(!isSupportedStatementFile(fileName,mimeType))throw new Error("IMPORT_USER:Solo puedo leer PDF, Excel (.xls/.xlsx), CSV o imágenes JPG, PNG y WEBP.");
  const scope=isPersonalStatementImport(caption)?"personal":"shared";const accounts=await getImportAccounts(db,userId,householdId,scope);
  if(!accounts.length)throw new Error(`IMPORT_USER:Primero crea una cuenta ${scope==="shared"?"compartida":"personal"} de banco, tarjeta o efectivo en la web.`);
  await sendTelegramMessage(message.chat.id,"Estoy leyendo el archivo y preparando una vista previa. Puede tardar unos segundos…");
  const [{data:categories,error:categoryError},bytes]=await Promise.all([db.from("categories").select("name,kind").or(`household_id.eq.${householdId},household_id.is.null`),downloadTelegramFile(attachment.file_id)]);if(categoryError)throw categoryError;
  const extraction=await extractStatementTransactions({bytes,fileName,mimeType,caption},categories??[]);
  if(!extraction.transactions.length)throw new Error("IMPORT_USER:No encontré movimientos legibles. Prueba con el PDF original o una imagen más nítida.");
  const payload=statementImportPayloadSchema.parse({kind:"statement_import",file_name:fileName,account_name:accounts.length===1?accounts[0].name:null,scope,transactions:extraction.transactions,omitted_rows:extraction.omitted_rows,note:extraction.note});
  await db.from("pending_actions").delete().eq("user_id",userId);const {error}=await db.from("pending_actions").insert({user_id:userId,household_id:householdId,action_type:"import_statement",payload,expires_at:new Date(Date.now()+30*60*1000).toISOString()});if(error)throw error;
  return statementPreview(payload,accounts);
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
  const {data}=await db.from("pending_actions").select("id,payload,action_type").eq("user_id",userId).eq("household_id",householdId).gt("expires_at",new Date().toISOString()).order("created_at",{ascending:false}).limit(1).maybeSingle();
  if(!data)return "No hay ninguna acción pendiente o ya ha caducado.";
  if(data.action_type==="import_statement"){
    const result=await executeStatementImport(db,userId,householdId,data.payload);await db.from("pending_actions").delete().eq("id",data.id);
    return `Importación terminada en ${result.accountName}: ${result.created} movimientos registrados${result.duplicates?`, ${result.duplicates} duplicados omitidos`:""}${result.failed?`, ${result.failed} no pudieron registrarse`:""}.`;
  }
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
  const message=parsed.data.message;const {chat,from}=message;const text=(message.text??message.caption??"").trim();const db=createAdminClient();
  try{
    if(text.startsWith("/start")){await sendTelegramMessage(chat.id,"Hola 👋 Soy el asistente de <b>Miti-Miti</b>. Vincula tu cuenta desde Ajustes y envíame <code>/vincular CÓDIGO</code>.");return NextResponse.json({ok:true});}
    if(text.startsWith("/ayuda")){await sendTelegramMessage(chat.id,"En Miti-Miti puedes decirme “Gasté 42 euros en Mercadona” o “Ingresé 500 euros en Banco”. También puedes adjuntar un PDF, Excel, CSV o imagen de un extracto: te mostraré una vista previa antes de registrar nada. El archivo se procesa con OpenAI y no se guarda en Miti-Miti. Los movimientos son compartidos por defecto; añade “personal” si deben ir solo a tu espacio privado. Si tienes varias cuentas te preguntaré cuál usar. Comandos: /resumen, /ultimos y /cancelar.");return NextResponse.json({ok:true});}
    if(text.startsWith("/vincular")){
      const code=text.split(/\s+/)[1]?.trim().toUpperCase();
      if(!code){await sendTelegramMessage(chat.id,"Falta el código. Ejemplo: <code>/vincular ABC12345</code>");return NextResponse.json({ok:true});}
      const {data:activeCode,error:codeError}=await db.from("telegram_link_codes").select("user_id").eq("code",code).is("used_at",null).gt("expires_at",new Date().toISOString()).maybeSingle();
      if(codeError)throw codeError;
      if(!activeCode){await sendTelegramMessage(chat.id,"Ese código no es válido o ha caducado. Genera uno nuevo en Ajustes e inténtalo otra vez.");return NextResponse.json({ok:true});}
      const {error:unlinkError}=await db.from("telegram_links").delete().eq("telegram_user_id",from.id).neq("user_id",activeCode.user_id);
      if(unlinkError)throw unlinkError;
      const {error}=await db.rpc("link_telegram_account",{p_code:code,p_telegram_user_id:from.id,p_telegram_chat_id:chat.id});
      if(error)throw error;
      await sendTelegramMessage(chat.id,"¡Listo! Tu Telegram ya está vinculado con Miti-Miti.");return NextResponse.json({ok:true});
    }
    const {data:link}=await db.from("telegram_links").select("user_id").eq("telegram_user_id",from.id).maybeSingle();if(!link){await sendTelegramMessage(chat.id,"No reconozco esta cuenta. Genera un código en Ajustes y usa <code>/vincular CÓDIGO</code>.");return NextResponse.json({ok:true});}
    const {data:membership}=await db.from("household_members").select("household_id").eq("user_id",link.user_id).maybeSingle();if(!membership)throw new Error("Tu cuenta aún no pertenece a un hogar.");
    const importReply=await handleStatementAttachment(db,message,link.user_id,membership.household_id);if(importReply){await sendTelegramMessage(chat.id,withTelegramWebSuggestion(importReply));return NextResponse.json({ok:true});}
    if(text==="/cancelar"||no.test(text)){await db.from("pending_actions").delete().eq("user_id",link.user_id);await sendTelegramMessage(chat.id,"Acción cancelada.");return NextResponse.json({ok:true});}
    const importAccountReply=await handlePendingImportAccountSelection(db,link.user_id,membership.household_id,text);if(importAccountReply){await sendTelegramMessage(chat.id,withTelegramWebSuggestion(importAccountReply));return NextResponse.json({ok:true});}
    const accountSelectionReply=await handlePendingAccountSelection(db,link.user_id,membership.household_id,text);if(accountSelectionReply){await db.from("conversation_messages").insert([{user_id:link.user_id,household_id:membership.household_id,role:"user",content:text},{user_id:link.user_id,household_id:membership.household_id,role:"assistant",content:accountSelectionReply}]);await sendTelegramMessage(chat.id,withTelegramWebSuggestion(accountSelectionReply));return NextResponse.json({ok:true});}
    if(yes.test(text)){await sendTelegramMessage(chat.id,withTelegramWebSuggestion(await confirmPending(db,link.user_id,membership.household_id)));return NextResponse.json({ok:true});}
    if(text==="/resumen"){await sendTelegramMessage(chat.id,withTelegramWebSuggestion(await getMonthSummary(db,membership.household_id,link.user_id)));return NextResponse.json({ok:true});}
    if(text==="/ultimos"){await sendTelegramMessage(chat.id,withTelegramWebSuggestion(await getRecentTransactions(db,membership.household_id,link.user_id)));return NextResponse.json({ok:true});}
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
    await db.from("conversation_messages").insert({user_id:link.user_id,household_id:membership.household_id,role:"assistant",content:reply});await sendTelegramMessage(chat.id,withTelegramWebSuggestion(reply));
  }catch(error){console.error("Telegram webhook error",error);const safeMessage=error instanceof Error&&error.message.startsWith("IMPORT_USER:")?error.message.slice("IMPORT_USER:".length):error instanceof Error&&error.message.startsWith("Indica qué cuenta")?error.message:"No he podido completar eso. Inténtalo de nuevo.";await sendTelegramMessage(chat.id,withTelegramWebSuggestion(safeMessage)).catch(()=>undefined);}
  return NextResponse.json({ok:true});
}
