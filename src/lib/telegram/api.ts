export type InlineKeyboardButton = { text: string; callback_data: string };
export type InlineKeyboardMarkup = { inline_keyboard: InlineKeyboardButton[][] };

export function escapeTelegramHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

export function withTelegramWebSuggestion(message: string) {
  const configuredUrl=process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/,"");
  const appUrl=configuredUrl?.startsWith("https://")?configuredUrl:"https://finanzas-app-six-kappa.vercel.app";
  return `${escapeTelegramHtml(message)}\n\nSi quieres revisar el detalle, ingresa a la web.\nEnlace: <a href="${escapeTelegramHtml(appUrl)}">${escapeTelegramHtml(appUrl)}</a>`;
}

async function callTelegramApi(method: string, body: Record<string, unknown>) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN no está configurado");
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {const result=await response.json().catch(()=>null) as {description?:string}|null;throw new Error(result?.description??`Telegram respondió ${response.status}`);}
}

export async function sendTelegramMessage(chatId: number, text: string, replyMarkup?: InlineKeyboardMarkup) {
  await callTelegramApi("sendMessage", { chat_id: chatId, text, parse_mode: "HTML", reply_markup: replyMarkup });
}

export async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  await callTelegramApi("answerCallbackQuery", { callback_query_id: callbackQueryId, text });
}

export async function editMessageReplyMarkup(chatId: number, messageId: number, replyMarkup: InlineKeyboardMarkup) {
  await callTelegramApi("editMessageReplyMarkup", { chat_id: chatId, message_id: messageId, reply_markup: replyMarkup });
}

export async function editMessageText(chatId: number, messageId: number, text: string, replyMarkup?: InlineKeyboardMarkup) {
  await callTelegramApi("editMessageText", { chat_id: chatId, message_id: messageId, text, parse_mode: "HTML", reply_markup: replyMarkup });
}

export const MAX_TELEGRAM_IMPORT_BYTES = 12 * 1024 * 1024;

export async function downloadTelegramFile(fileId: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN no está configurado");
  const metadataResponse = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${encodeURIComponent(fileId)}`);
  const metadata = await metadataResponse.json().catch(() => null) as { ok?: boolean; result?: { file_path?: string; file_size?: number }; description?: string } | null;
  const filePath = metadata?.result?.file_path;
  if (!metadataResponse.ok || !metadata?.ok || !filePath || filePath.includes("..")) throw new Error(metadata?.description ?? "Telegram no entregó el archivo");
  if ((metadata.result?.file_size ?? 0) > MAX_TELEGRAM_IMPORT_BYTES) throw new Error("El archivo supera el límite de 12 MB");
  const fileResponse = await fetch(`https://api.telegram.org/file/bot${token}/${filePath}`);
  if (!fileResponse.ok) throw new Error("No pude descargar el archivo de Telegram");
  const bytes = new Uint8Array(await fileResponse.arrayBuffer());
  if (bytes.byteLength > MAX_TELEGRAM_IMPORT_BYTES) throw new Error("El archivo supera el límite de 12 MB");
  return bytes;
}
