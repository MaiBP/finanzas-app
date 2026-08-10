import { loadEnvFile } from "node:process";

try {
  loadEnvFile(".env.local");
} catch {
  // En CI/Vercel las variables ya están en el entorno.
}

const token = process.env.TELEGRAM_BOT_TOKEN;
const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
const infoOnly = process.argv.includes("--info");
const dropPending = process.argv.includes("--drop-pending");

if (!token) throw new Error("Falta TELEGRAM_BOT_TOKEN");
if (!secret || !/^[A-Za-z0-9_-]{1,256}$/.test(secret)) {
  throw new Error("TELEGRAM_WEBHOOK_SECRET debe tener 1-256 caracteres: letras, números, _ o -");
}

async function telegram(method, body) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: body ? "POST" : "GET",
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error(result.description ?? `Telegram respondió ${response.status}`);
  return result.result;
}

const bot = await telegram("getMe");
console.log(`Bot verificado: ${bot.first_name} (@${bot.username})`);

if (!infoOnly) {
  if (!appUrl || !appUrl.startsWith("https://") || /localhost|127\.0\.0\.1/.test(appUrl)) {
    throw new Error("NEXT_PUBLIC_APP_URL debe ser la URL HTTPS pública del despliegue");
  }
  const webhookUrl = `${appUrl}/api/telegram/webhook`;
  await telegram("setMyName", { name: "Miti-Miti" });
  await telegram("setMyShortDescription", { short_description: "Finanzas compartidas y personales, sin dramas." });
  await telegram("setMyDescription", { description: "Miti-Miti registra gastos e ingresos, lee extractos PDF, Excel o imágenes, consulta tus espacios y detecta patrones financieros." });
  await telegram("setWebhook", {
    url: webhookUrl,
    secret_token: secret,
    allowed_updates: ["message", "callback_query"],
    drop_pending_updates: dropPending,
  });
  await telegram("setMyCommands", {
    commands: [
      { command: "start", description: "Empezar" },
      { command: "ayuda", description: "Ver ejemplos y comandos" },
      { command: "vincular", description: "Vincular tu cuenta" },
      { command: "resumen", description: "Resumen del mes" },
      { command: "ultimos", description: "Últimos movimientos" },
      { command: "cancelar", description: "Cancelar una acción pendiente" },
    ],
  });
  console.log(`Webhook registrado: ${webhookUrl}`);
  if (dropPending) console.log("Actualizaciones pendientes del uso anterior descartadas.");
}

const info = await telegram("getWebhookInfo");
console.log(`Webhook actual: ${info.url || "ninguno"}`);
console.log(`Actualizaciones pendientes: ${info.pending_update_count}`);
if (info.last_error_message) console.log(`Último error: ${info.last_error_message}`);
