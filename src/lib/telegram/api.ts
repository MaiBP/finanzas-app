export function escapeTelegramHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

export function withTelegramWebSuggestion(message: string) {
  const configuredUrl=process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/,"");
  const appUrl=configuredUrl?.startsWith("https://")?configuredUrl:"https://finanzas-app-six-kappa.vercel.app";
  return `${escapeTelegramHtml(message)}\n\nSi quieres revisar el detalle, ingresa a la web.\nEnlace: <a href="${escapeTelegramHtml(appUrl)}">${escapeTelegramHtml(appUrl)}</a>`;
}

export async function sendTelegramMessage(chatId: number, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN no está configurado");
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  });
  if (!response.ok) {const result=await response.json().catch(()=>null) as {description?:string}|null;throw new Error(result?.description??`Telegram respondió ${response.status}`);}
}
