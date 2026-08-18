import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidWebhookSecret } from "@/lib/telegram/security";
import { checkTelegramMessageRateLimit, checkTelegramVoiceRateLimit, MAX_VOICE_DURATION_SECONDS } from "@/lib/telegram/rate-limit";
import { answerCallbackQuery, downloadTelegramFile, editMessageReplyMarkup, editMessageText, escapeTelegramHtml, MAX_TELEGRAM_IMPORT_BYTES, sendTelegramMessage, withTelegramWebSuggestion, type InlineKeyboardMarkup } from "@/lib/telegram/api";
import { confirmCancelKeyboard, createTransactionDecisionKeyboard, importDecisionKeyboard, importReviewKeyboard } from "@/lib/telegram/keyboards";
import { parseFinancialMessage } from "@/services/financial-message-parser";
import { financialActionSchema, type FinancialAction } from "@/services/financial-message-parser/schema";
import { executeTelegramAction } from "@/services/transaction-service/telegram";
import { accountSelectionQuestion, accountsForAction, assignOnlyAccount, describeCreateTransaction, matchAccountSelection, type AccountOption, type CreateTransactionAction } from "@/services/transaction-service/account-selection";
import { executeFinanceQuery, getMonthSummary, getRecentTransactions } from "@/services/query-service";
import { executeStatementImport, extractStatementTransactions, isPersonalStatementImport, isSupportedStatementFile, reviseStatementImport, statementImportPayloadSchema, statementPreview } from "@/services/statement-import";
import { transcribeVoiceMessage } from "@/services/voice-transcription";
import { fetchRecentMessages, recordMessage } from "@/services/conversation-history";
import { redactHouseholdNames, redactRecentMessages, HOUSEHOLD_NAME_PRIVACY_NOTE, type HouseholdMember } from "@/services/privacy/redact-household-names";
import { decryptField } from "@/lib/security/field-encryption";

function normalize(value: string) {
  return value.normalize("NFD").replace(new RegExp("[\\u0300-\\u036f]", "g"), "").toLocaleLowerCase("es").trim();
}

export const maxDuration=60;

const telegramFileSchema=z.object({file_id:z.string(),file_unique_id:z.string(),file_name:z.string().max(180).optional(),mime_type:z.string().max(100).optional(),file_size:z.number().nonnegative().optional()});
const telegramPhotoSchema=z.object({file_id:z.string(),file_unique_id:z.string(),file_size:z.number().nonnegative().optional(),width:z.number().optional(),height:z.number().optional()});
const telegramVoiceSchema=z.object({file_id:z.string(),file_unique_id:z.string(),duration:z.number().nonnegative(),mime_type:z.string().max(100).optional(),file_size:z.number().nonnegative().optional()});
const callbackQuerySchema=z.object({id:z.string(),data:z.string().max(64).optional(),from:z.object({id:z.number()}),message:z.object({chat:z.object({id:z.number()}),message_id:z.number()}).optional()});
const updateSchema=z.object({message:z.object({chat:z.object({id:z.number()}),from:z.object({id:z.number()}),text:z.string().max(2000).optional(),caption:z.string().max(2000).optional(),document:telegramFileSchema.optional(),photo:z.array(telegramPhotoSchema).optional(),voice:telegramVoiceSchema.optional()}).optional(),callback_query:callbackQuerySchema.optional()});
const yes=/^(sí|si|confirmo|correcto|vale|ok)$/i; const no=/^(no|cancelar|cancela)$/i;

async function queueAction(db:ReturnType<typeof createAdminClient>,userId:string,householdId:string,action:FinancialAction){
  await db.from("pending_actions").delete().eq("user_id",userId);
  const {error}=await db.from("pending_actions").insert({user_id:userId,household_id:householdId,action_type:action.action,payload:action,expires_at:new Date(Date.now()+10*60*1000).toISOString()});
  if(error)throw error;
}

async function getAccountsForAction(db:ReturnType<typeof createAdminClient>,userId:string,householdId:string,action:CreateTransactionAction){
  let query=db.from("accounts").select("name,is_shared,type").eq("household_id",householdId).neq("type","joint").is("archived_at",null);
  query=action.data.scope==="shared"?query.eq("is_shared",true):query.eq("is_shared",false).eq("owner_user_id",userId);
  const {data,error}=await query.order("created_at"); if(error)throw error;
  return (data??[]) as AccountOption[];
}

async function getImportAccounts(db:ReturnType<typeof createAdminClient>,userId:string,householdId:string,scope:"shared"|"personal"){
  let query=db.from("accounts").select("name,is_shared,type").eq("household_id",householdId).neq("type","joint").is("archived_at",null);
  query=scope==="shared"?query.eq("is_shared",true):query.eq("is_shared",false).eq("owner_user_id",userId);
  const {data,error}=await query.order("created_at");if(error)throw error;return (data??[]) as AccountOption[];
}

async function handlePendingImportAccountSelection(db:ReturnType<typeof createAdminClient>,userId:string,householdId:string,text:string){
  const {data}=await db.from("pending_actions").select("id,payload").eq("user_id",userId).eq("household_id",householdId).eq("action_type","import_statement").gt("expires_at",new Date().toISOString()).order("created_at",{ascending:false}).limit(1).maybeSingle();
  const parsed=statementImportPayloadSchema.safeParse(data?.payload);if(!data||!parsed.success||parsed.data.account_name)return null;
  const accounts=await getImportAccounts(db,userId,householdId,parsed.data.scope);const selected=matchAccountSelection(text,accounts);
  if(!selected)return {text:`🤔 Antes de importar, elige una cuenta:\n${accounts.map((account,index)=>`${index+1}. ${account.name}`).join("\n")}`,keyboard:importDecisionKeyboard(accounts,null)};
  const payload={...parsed.data,account_name:selected.name};const {error}=await db.from("pending_actions").update({payload}).eq("id",data.id);if(error)throw error;
  return {text:statementPreview(payload,accounts),keyboard:accounts.length>1?importDecisionKeyboard(accounts,selected.name):importReviewKeyboard()};
}

async function handlePendingImportEdit(db:ReturnType<typeof createAdminClient>,userId:string,householdId:string,text:string){
  const {data}=await db.from("pending_actions").select("id,payload").eq("user_id",userId).eq("household_id",householdId).eq("action_type","import_statement").gt("expires_at",new Date().toISOString()).order("created_at",{ascending:false}).limit(1).maybeSingle();
  const parsed=statementImportPayloadSchema.safeParse(data?.payload);if(!data||!parsed.success||!parsed.data.account_name)return null;
  const {data:categories,error:categoryError}=await db.from("categories").select("name,kind").or(`household_id.eq.${householdId},household_id.is.null`);if(categoryError)throw categoryError;
  const transactions=await reviseStatementImport(parsed.data.transactions,text,categories??[]);
  if(!transactions.length)throw new Error("IMPORT_USER:No encontré movimientos después de esa corrección. Probá de nuevo o cancelá con “no”.");
  const payload=statementImportPayloadSchema.parse({...parsed.data,transactions});
  const {error}=await db.from("pending_actions").update({payload}).eq("id",data.id);if(error)throw error;
  const accounts=await getImportAccounts(db,userId,householdId,payload.scope);
  return {text:statementPreview(payload,accounts),keyboard:importReviewKeyboard()};
}

async function handleStatementAttachment(db:ReturnType<typeof createAdminClient>,message:NonNullable<z.infer<typeof updateSchema>["message"]>,userId:string,householdId:string){
  const photo=message.photo?.at(-1);const attachment=message.document??photo;if(!attachment)return null;
  const fileName=message.document?.file_name??"resumen.jpg";const mimeType=message.document?.mime_type??"image/jpeg";const caption=message.caption??"";
  if((attachment.file_size??0)>MAX_TELEGRAM_IMPORT_BYTES)throw new Error("IMPORT_USER:El archivo supera el límite de 12 MB.");
  if(!isSupportedStatementFile(fileName,mimeType))throw new Error("IMPORT_USER:Solo puedo leer PDF, Excel (.xls/.xlsx), CSV o imágenes JPG, PNG y WEBP.");
  const scope=isPersonalStatementImport(caption)?"personal":"shared";const accounts=await getImportAccounts(db,userId,householdId,scope);
  if(!accounts.length)throw new Error(`IMPORT_USER:Primero crea una cuenta ${scope==="shared"?"compartida":"personal"} de banco, tarjeta o efectivo en la web.`);
  await sendTelegramMessage(message.chat.id,"📄 Estoy leyendo el archivo y preparando una vista previa. Puede tardar unos segundos…");
  const [{data:categories,error:categoryError},bytes]=await Promise.all([db.from("categories").select("name,kind").or(`household_id.eq.${householdId},household_id.is.null`),downloadTelegramFile(attachment.file_id)]);if(categoryError)throw categoryError;
  const extraction=await extractStatementTransactions({bytes,fileName,mimeType,caption},categories??[]);
  if(!extraction.transactions.length)throw new Error("IMPORT_USER:No encontré movimientos legibles. Prueba con el PDF original o una imagen más nítida.");
  const payload=statementImportPayloadSchema.parse({kind:"statement_import",file_name:fileName,account_name:accounts.length===1?accounts[0].name:null,scope,transactions:extraction.transactions,omitted_rows:extraction.omitted_rows,note:extraction.note});
  await db.from("pending_actions").delete().eq("user_id",userId);const {error}=await db.from("pending_actions").insert({user_id:userId,household_id:householdId,action_type:"import_statement",payload,expires_at:new Date(Date.now()+30*60*1000).toISOString()});if(error)throw error;
  return {text:statementPreview(payload,accounts),keyboard:accounts.length>1?importDecisionKeyboard(accounts,payload.account_name):importReviewKeyboard()};
}

async function handlePendingAccountSelection(db:ReturnType<typeof createAdminClient>,userId:string,householdId:string,text:string){
  const {data}=await db.from("pending_actions").select("id,payload").eq("user_id",userId).eq("household_id",householdId).eq("action_type","create_transaction").gt("expires_at",new Date().toISOString()).order("created_at",{ascending:false}).limit(1).maybeSingle();
  const parsed=financialActionSchema.safeParse(data?.payload); if(!data||!parsed.success||parsed.data.action!=="create_transaction"||parsed.data.data.account_name)return null;
  const accounts=await getAccountsForAction(db,userId,householdId,parsed.data); if(accounts.length<2)return null;
  const selected=matchAccountSelection(text,accounts); if(!selected)return null;
  const action={...parsed.data,data:{...parsed.data.data,account_name:selected.name}};
  if(action.requires_confirmation){const {error}=await db.from("pending_actions").update({payload:action}).eq("id",data.id);if(error)throw error;return {text:`${describeCreateTransaction(action)}\n\n📋 Usaré ${selected.name}.`,keyboard:createTransactionDecisionKeyboard(accounts,selected.name),confirmed:false};}
  const reply=await executeTelegramAction(db,userId,householdId,action); await db.from("pending_actions").delete().eq("id",data.id); return {text:reply,confirmed:true};
}

async function confirmPending(db:ReturnType<typeof createAdminClient>,userId:string,householdId:string):Promise<{text:string;confirmed:boolean}>{
  const {data}=await db.from("pending_actions").select("id,payload,action_type").eq("user_id",userId).eq("household_id",householdId).gt("expires_at",new Date().toISOString()).order("created_at",{ascending:false}).limit(1).maybeSingle();
  if(!data)return {text:"🤷 No hay ninguna acción pendiente o ya ha caducado.",confirmed:false};
  if(data.action_type==="import_statement"){
    const result=await executeStatementImport(db,userId,householdId,data.payload);await db.from("pending_actions").delete().eq("id",data.id);
    const movementWord=result.created===1?"movimiento":"movimientos";
    const duplicatesNote=result.duplicates?` (omití ${result.duplicates} ${result.duplicates===1?"duplicado":"duplicados"})`:"";
    const failuresNote=result.failed?`\n⚠️ ${result.failed} ${result.failed===1?"no se pudo registrar":"no se pudieron registrar"}${result.failureReasons.length?`: ${result.failureReasons.join("; ")}`:""}.`:"";
    const text=result.created
      ? `✅ ¡Listo! Registré ${result.created} ${movementWord} en ${result.accountName}${duplicatesNote}.${failuresNote}`
      : `⚠️ No pude registrar nada en ${result.accountName}.${failuresNote}`;
    return {text,confirmed:result.created>0};
  }
  let action=financialActionSchema.parse(data.payload); let reply:string; let confirmed=false;
  if(action.action==="create_transaction"){
    const accounts=await getAccountsForAction(db,userId,householdId,action); action=assignOnlyAccount(action,accounts);
    if(!action.data.account_name&&accounts.length>1)return {text:accountSelectionQuestion(action,accounts),confirmed:false};
    reply=await executeTelegramAction(db,userId,householdId,action); confirmed=true;
  }
  else if(action.action==="delete_transaction"){
    // description is encrypted at rest (non-deterministic ciphertext), so "delete by reference"
    // can't ilike-match in SQL anymore: fetch recent candidates, decrypt, match in JS.
    let transaction:{id:string;description:string}|null=null;
    if(action.data.transaction_id){
      const {data}=await db.from("transactions").select("id,description").eq("household_id",householdId).eq("created_by",userId).eq("status","confirmed").eq("id",action.data.transaction_id).maybeSingle();
      transaction=data;
    } else if(action.data.reference){
      const {data:candidates}=await db.from("transactions").select("id,description").eq("household_id",householdId).eq("created_by",userId).eq("status","confirmed").order("created_at",{ascending:false}).limit(50);
      const referenceNormalized=normalize(action.data.reference);
      transaction=(candidates??[]).find(row=>normalize(decryptField(row.description)).includes(referenceNormalized))??null;
    }
    if(!transaction)throw new Error("No encuentro un movimiento tuyo que coincida.");
    const description=decryptField(transaction.description);
    const {error}=await db.from("transactions").update({status:"deleted",deleted_at:new Date().toISOString()}).eq("id",transaction.id).eq("created_by",userId); if(error)throw error; reply=`🗑️ He eliminado “${description}”.`; confirmed=true;
  } else {reply="🔒 Esta edición necesita hacerse desde la web por seguridad.";confirmed=true;}
  await db.from("pending_actions").delete().eq("id",data.id); return {text:reply,confirmed};
}

async function handleCallbackQuery(callbackQuery:z.infer<typeof callbackQuerySchema>){
  const db=createAdminClient();
  await answerCallbackQuery(callbackQuery.id).catch(()=>undefined);
  const data=callbackQuery.data; const chatId=callbackQuery.message?.chat.id; const messageId=callbackQuery.message?.message_id;
  if(!data||chatId===undefined)return;
  const {data:link}=await db.from("telegram_links").select("user_id").eq("telegram_user_id",callbackQuery.from.id).maybeSingle(); if(!link)return;
  const {data:membership}=await db.from("household_members").select("household_id").eq("user_id",link.user_id).maybeSingle(); if(!membership)return;

  let reply:string; let keyboard:InlineKeyboardMarkup|undefined; let confirmed=false; let editInPlace=false;
  try{
    if(data.startsWith("confirm:")){
      const [,choice,actionType]=data.split(":");
      const {data:pending}=await db.from("pending_actions").select("action_type").eq("user_id",link.user_id).eq("household_id",membership.household_id).gt("expires_at",new Date().toISOString()).order("created_at",{ascending:false}).limit(1).maybeSingle();
      if(pending?.action_type!==actionType)reply="⚠️ Esa opción ya no está disponible.";
      else if(choice==="yes"){const result=await confirmPending(db,link.user_id,membership.household_id);reply=result.text;confirmed=result.confirmed;}
      else {await db.from("pending_actions").delete().eq("user_id",link.user_id);reply="❌ ¡Listo! No registré nada.";}
    }
    else if(data.startsWith("account:")){
      // Same in-place-edit idea as import-account below, but only while the account pick still
      // needs a follow-up confirm — once it actually registers the movement (confirmed=true),
      // that's a real state change worth its own new message.
      const index=data.slice("account:".length);
      const selection=await handlePendingAccountSelection(db,link.user_id,membership.household_id,index);
      reply=selection?.text??"⚠️ Esa opción ya no está disponible."; keyboard=selection?.keyboard; confirmed=selection?.confirmed??false; editInPlace=Boolean(selection)&&!confirmed;
    }
    else if(data.startsWith("import-account:")){
      // Picking an account here just updates the same card in place (text + keyboard, with that
      // account checked off) — it isn't a state transition worth a brand-new message, unlike
      // confirming/cancelling/editing below.
      const index=data.slice("import-account:".length);
      const selection=await handlePendingImportAccountSelection(db,link.user_id,membership.household_id,index);
      reply=selection?.text??"⚠️ Esa opción ya no está disponible."; keyboard=selection?.keyboard; editInPlace=true;
    }
    else if(data.startsWith("edit:")){
      reply="✍️ Contame qué querés corregir (por ejemplo: “el segundo producto son 30€, no 25€” o “la fecha es el 3 de agosto”).";
    }
    else return;
  }catch(error){reply=error instanceof Error?error.message:"⚠️ No he podido completar eso. Inténtalo de nuevo.";}

  await recordMessage(db,{userId:link.user_id,householdId:membership.household_id,role:"assistant",content:reply});
  if(editInPlace&&messageId!==undefined){await editMessageText(chatId,messageId,escapeTelegramHtml(reply),keyboard).catch(()=>undefined);return;}
  if(messageId!==undefined)await editMessageReplyMarkup(chatId,messageId,{inline_keyboard:[]}).catch(()=>undefined);
  await sendTelegramMessage(chatId,confirmed?withTelegramWebSuggestion(reply):escapeTelegramHtml(reply),keyboard).catch(()=>undefined);
}

export async function POST(request:Request){
  if(!isValidWebhookSecret(request.headers.get("x-telegram-bot-api-secret-token"),process.env.TELEGRAM_WEBHOOK_SECRET))return NextResponse.json({error:"Unauthorized"},{status:401});
  const parsed=updateSchema.safeParse(await request.json().catch(()=>null)); if(!parsed.success)return NextResponse.json({ok:true});
  if(parsed.data.callback_query){await handleCallbackQuery(parsed.data.callback_query).catch(error=>console.error("Telegram callback error",error));return NextResponse.json({ok:true});}
  if(!parsed.data.message)return NextResponse.json({ok:true});
  const message=parsed.data.message;const {chat,from}=message;let text=(message.text??message.caption??"").trim();const db=createAdminClient();
  try{
    if(!(await checkTelegramMessageRateLimit(db,from.id))){await sendTelegramMessage(chat.id,"⏳ Has enviado demasiados mensajes seguidos. Espera un momento y vuelve a intentarlo.");return NextResponse.json({ok:true});}
    if(text.startsWith("/ayuda")){await sendTelegramMessage(chat.id,"💡 En Miti-Miti puedes decirme “Gasté 42 euros en Mercadona” o “Ingresé 500 euros en Banco”, por texto o por nota de voz. También puedes adjuntar un PDF, Excel, CSV o imagen de un extracto: te mostraré una vista previa antes de registrar nada, y si algo está mal podés contarme qué corregir antes de confirmar. Los archivos y notas de voz se procesan con OpenAI y no se guardan en Miti-Miti. Los movimientos son compartidos por defecto; añade “personal” si deben ir solo a tu espacio privado. Si tienes varias cuentas te preguntaré cuál usar. Comandos: 📊 /resumen · 🧾 /ultimos · ❌ /cancelar.");return NextResponse.json({ok:true});}
    if(text.startsWith("/start")||text.startsWith("/vincular")){
      // Telegram's deep link (t.me/<bot>?start=CODE) sends "/start CODE" automatically, so it
      // shares this same linking branch instead of only showing the greeting.
      const code=text.split(/\s+/)[1]?.trim().toUpperCase();
      if(!code){
        if(text.startsWith("/vincular")){await sendTelegramMessage(chat.id,"⚠️ Falta el código. Ejemplo: <code>/vincular ABC12345</code>");return NextResponse.json({ok:true});}
        await sendTelegramMessage(chat.id,"Hola 👋 Soy el asistente de <b>Miti-Miti</b>. Vincula tu cuenta desde Ajustes y envíame <code>/vincular CÓDIGO</code>.");return NextResponse.json({ok:true});
      }
      const {data:activeCode,error:codeError}=await db.from("telegram_link_codes").select("user_id").eq("code",code).is("used_at",null).gt("expires_at",new Date().toISOString()).maybeSingle();
      if(codeError)throw codeError;
      if(!activeCode){await sendTelegramMessage(chat.id,"⚠️ Ese código no es válido o ha caducado. Genera uno nuevo en Ajustes e inténtalo otra vez.");return NextResponse.json({ok:true});}
      const {error:unlinkError}=await db.from("telegram_links").delete().eq("telegram_user_id",from.id).neq("user_id",activeCode.user_id);
      if(unlinkError)throw unlinkError;
      const {error}=await db.rpc("link_telegram_account",{p_code:code,p_telegram_user_id:from.id,p_telegram_chat_id:chat.id});
      if(error)throw error;
      await sendTelegramMessage(chat.id,"✅ ¡Listo! Tu Telegram ya está vinculado con Miti-Miti.");return NextResponse.json({ok:true});
    }
    const {data:link}=await db.from("telegram_links").select("user_id").eq("telegram_user_id",from.id).maybeSingle();if(!link){await sendTelegramMessage(chat.id,"🤔 No reconozco esta cuenta. Genera un código en Ajustes y usa <code>/vincular CÓDIGO</code>.");return NextResponse.json({ok:true});}
    const {data:membership}=await db.from("household_members").select("household_id").eq("user_id",link.user_id).maybeSingle();if(!membership)throw new Error("Tu cuenta aún no pertenece a un hogar.");
    if(message.voice&&!text){
      if(message.voice.duration>MAX_VOICE_DURATION_SECONDS)throw new Error("VOICE_USER:Los audios pueden durar como máximo 2 minutos.");
      if(!(await checkTelegramVoiceRateLimit(db,from.id)))throw new Error("VOICE_USER:Has enviado demasiadas notas de voz. Espera un momento y vuelve a intentarlo.");
      await sendTelegramMessage(chat.id,"🎙️ Estoy escuchando el audio…");
      const bytes=await downloadTelegramFile(message.voice.file_id).catch(()=>{throw new Error("VOICE_USER:No pude descargar el audio. Inténtalo de nuevo.");});
      text=(await transcribeVoiceMessage(bytes,message.voice.mime_type??"audio/ogg").catch(()=>{throw new Error("VOICE_USER:No entendí el audio, prueba a grabarlo de nuevo o escribe el mensaje.");})).trim();
    }
    const importReply=await handleStatementAttachment(db,message,link.user_id,membership.household_id);if(importReply){await sendTelegramMessage(chat.id,escapeTelegramHtml(importReply.text),importReply.keyboard);return NextResponse.json({ok:true});}
    if(text==="/cancelar"||no.test(text)){await db.from("pending_actions").delete().eq("user_id",link.user_id);await sendTelegramMessage(chat.id,"❌ ¡Listo! No registré nada.");return NextResponse.json({ok:true});}
    const importAccountReply=await handlePendingImportAccountSelection(db,link.user_id,membership.household_id,text);if(importAccountReply){await sendTelegramMessage(chat.id,escapeTelegramHtml(importAccountReply.text),importAccountReply.keyboard);return NextResponse.json({ok:true});}
    const importEditReply=await handlePendingImportEdit(db,link.user_id,membership.household_id,text);if(importEditReply){await recordMessage(db,{userId:link.user_id,householdId:membership.household_id,role:"user",content:text});await recordMessage(db,{userId:link.user_id,householdId:membership.household_id,role:"assistant",content:importEditReply.text});await sendTelegramMessage(chat.id,escapeTelegramHtml(importEditReply.text),importEditReply.keyboard);return NextResponse.json({ok:true});}
    const accountSelectionReply=await handlePendingAccountSelection(db,link.user_id,membership.household_id,text);if(accountSelectionReply){await recordMessage(db,{userId:link.user_id,householdId:membership.household_id,role:"user",content:text});await recordMessage(db,{userId:link.user_id,householdId:membership.household_id,role:"assistant",content:accountSelectionReply.text});await sendTelegramMessage(chat.id,accountSelectionReply.confirmed?withTelegramWebSuggestion(accountSelectionReply.text):escapeTelegramHtml(accountSelectionReply.text),accountSelectionReply.keyboard);return NextResponse.json({ok:true});}
    if(yes.test(text)){const result=await confirmPending(db,link.user_id,membership.household_id);await sendTelegramMessage(chat.id,result.confirmed?withTelegramWebSuggestion(result.text):escapeTelegramHtml(result.text));return NextResponse.json({ok:true});}
    if(text==="/resumen"){await sendTelegramMessage(chat.id,escapeTelegramHtml(await getMonthSummary(db,membership.household_id,link.user_id)));return NextResponse.json({ok:true});}
    if(text==="/ultimos"){await sendTelegramMessage(chat.id,escapeTelegramHtml(await getRecentTransactions(db,membership.household_id,link.user_id)));return NextResponse.json({ok:true});}
    const [{data:categories},{data:accounts},recent,{data:membersData}]=await Promise.all([db.from("categories").select("name,kind").or(`household_id.eq.${membership.household_id},household_id.is.null`),db.from("accounts").select("name,is_shared,type").eq("household_id",membership.household_id).neq("type","joint").is("archived_at",null).or(`owner_user_id.eq.${link.user_id},is_shared.eq.true`),fetchRecentMessages(db,link.user_id),db.from("household_members").select("user_id,profiles(display_name)").eq("household_id",membership.household_id)]);
    await recordMessage(db,{userId:link.user_id,householdId:membership.household_id,role:"user",content:text});
    const roster=((membersData??[]) as unknown as {user_id:string;profiles:{display_name:string|null}|null}[]).map((member):HouseholdMember=>({userId:member.user_id,displayName:member.profiles?.display_name?decryptField(member.profiles.display_name):null}));
    const {text:safeText,mentioned:textMentioned}=redactHouseholdNames(text,roster,link.user_id);
    const {messages:safeRecent,mentioned:historyMentioned}=redactRecentMessages(recent,roster,link.user_id);
    const mentioned=textMentioned||historyMentioned;
    let action=await parseFinancialMessage({text:safeText,userId:link.user_id,householdId:membership.household_id,now:new Date().toISOString(),categories:categories??[],accounts:accounts??[],recentMessages:safeRecent});
    let reply:string; let keyboard:InlineKeyboardMarkup|undefined; let confirmed=false;
    if(action.action==="request_clarification")reply=action.data.question;
    else if(action.action==="general_question")reply=action.data.answer;
    else if(action.action==="query_finances")reply=await executeFinanceQuery(db,membership.household_id,link.user_id,action.data,new Date(),{question:safeText,recentMessages:safeRecent});
    else if(action.action==="cancel_action")reply="👍 De acuerdo, no hago nada.";
    else if(action.action==="update_transaction"){reply="🔒 Esta edición necesita hacerse desde la web por seguridad.";confirmed=true;}
    else if(action.action==="create_transaction"){
      const eligibleAccounts=accountsForAction(action,(accounts??[]) as AccountOption[]); action=assignOnlyAccount(action,eligibleAccounts);
      if(!action.data.account_name&&eligibleAccounts.length>1){await queueAction(db,link.user_id,membership.household_id,action);reply=accountSelectionQuestion(action,eligibleAccounts);keyboard=createTransactionDecisionKeyboard(eligibleAccounts,null);}
      else if(!action.requires_confirmation&&action.confidence>=.85){reply=await executeTelegramAction(db,link.user_id,membership.household_id,action);confirmed=true;}
      else {await queueAction(db,link.user_id,membership.household_id,action);reply=`${describeCreateTransaction(action)}\n\n📋 Queda pendiente.`;keyboard=confirmCancelKeyboard("create_transaction");}
    }
    else {await queueAction(db,link.user_id,membership.household_id,action);reply=action.action==="delete_transaction"?"🗑️ He encontrado la acción de borrado. Responde “sí” para confirmarla o “no” para cancelar.":"📋 Queda pendiente. Responde “sí” para confirmar o “no” para cancelar.";keyboard=confirmCancelKeyboard(action.action);}
    if(mentioned)reply=`${reply}\n\n${HOUSEHOLD_NAME_PRIVACY_NOTE}`;
    await recordMessage(db,{userId:link.user_id,householdId:membership.household_id,role:"assistant",content:reply});await sendTelegramMessage(chat.id,confirmed?withTelegramWebSuggestion(reply):escapeTelegramHtml(reply),keyboard);
  }catch(error){console.error("Telegram webhook error",error);const safeMessage=error instanceof Error&&error.message.startsWith("IMPORT_USER:")?`⚠️ ${error.message.slice("IMPORT_USER:".length)}`:error instanceof Error&&error.message.startsWith("VOICE_USER:")?`⚠️ ${error.message.slice("VOICE_USER:".length)}`:error instanceof Error&&error.message.startsWith("Indica qué cuenta")?`⚠️ ${error.message}`:"⚠️ No he podido completar eso. Inténtalo de nuevo.";await sendTelegramMessage(chat.id,escapeTelegramHtml(safeMessage)).catch(()=>undefined);}
  return NextResponse.json({ok:true});
}
