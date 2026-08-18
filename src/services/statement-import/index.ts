import OpenAI from "openai";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ResponseInputContent } from "openai/resources/responses/responses";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import { decryptField, encryptField } from "@/lib/security/field-encryption";
import { ITEM_SUBCATEGORIES, normalizeItemSubcategory } from "@/lib/finance/item-subcategories";

const MAX_IMPORTED_TRANSACTIONS = 60;
const MAX_ITEMS_PER_TRANSACTION = 60;
const imageMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const fileExtensions = new Set(["pdf", "csv", "xls", "xlsx", "jpg", "jpeg", "png", "webp"]);

const importedItemSchema = z.object({
  description: z.string().min(1).max(160),
  amount_cents: z.int().positive(),
  subcategory: z.string().min(1).max(60),
});

export const importedTransactionSchema = z.object({
  type: z.enum(["expense", "income"]),
  amount_cents: z.int().positive(),
  description: z.string().min(2).max(160),
  category: z.string().min(1).max(60),
  transaction_date: z.iso.date(),
  // OpenAI's structured-output strict mode forbids .optional() without .nullable() (every key
  // must be present in the model's JSON, just possibly null) — see zod-to-json-schema's
  // parseObjectDef, which throws otherwise. .optional() stays too so plain local objects (tests,
  // internal code) can still omit the key entirely.
  items: z.array(importedItemSchema).max(MAX_ITEMS_PER_TRANSACTION).nullable().optional(),
});

const extractionSchema = z.object({
  transactions: z.array(importedTransactionSchema).max(MAX_IMPORTED_TRANSACTIONS),
  omitted_rows: z.int().nonnegative(),
  note: z.string().max(300),
});

export const statementImportPayloadSchema = z.object({
  kind: z.literal("statement_import"),
  file_name: z.string().min(1).max(180),
  account_name: z.string().min(1).max(80).nullable(),
  scope: z.enum(["shared", "personal"]),
  transactions: z.array(importedTransactionSchema).min(1).max(MAX_IMPORTED_TRANSACTIONS),
  omitted_rows: z.int().nonnegative(),
  note: z.string().max(300),
});

export type StatementImportPayload = z.infer<typeof statementImportPayloadSchema>;

export interface StatementFile {
  bytes: Uint8Array;
  fileName: string;
  mimeType: string;
  caption?: string;
}

const extensionOf = (fileName: string) => fileName.split(".").pop()?.toLowerCase() ?? "";
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

function resolvedMimeType(fileName: string, mimeType: string) {
  const byExtension: Record<string,string>={pdf:"application/pdf",csv:"text/csv",xls:"application/vnd.ms-excel",xlsx:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",jpg:"image/jpeg",jpeg:"image/jpeg",png:"image/png",webp:"image/webp"};
  return byExtension[extensionOf(fileName)]??mimeType.toLowerCase();
}

export function isSupportedStatementFile(fileName: string, mimeType: string) {
  return imageMimeTypes.has(resolvedMimeType(fileName,mimeType)) || fileExtensions.has(extensionOf(fileName));
}

export function isPersonalStatementImport(caption = "") {
  return /(?:\bpersonal\b|\bprivad[oa]\b|solo para m[ií]|solo m[ií][oa]|no compartid[oa])/i.test(caption);
}

function dataUrl(file: StatementFile) {
  return `data:${resolvedMimeType(file.fileName,file.mimeType)};base64,${Buffer.from(file.bytes).toString("base64")}`;
}

export async function extractStatementTransactions(file: StatementFile, categories: { name: string; kind: string }[]) {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY no está configurada");
  if (!isSupportedStatementFile(file.fileName, file.mimeType)) throw new Error("Formato no compatible");

  const availableCategories = categories.filter(category => category.kind === "expense" || category.kind === "income");
  const prompt = `Extrae los movimientos financieros reales de este resumen o extracto.
Reglas obligatorias:
- Devuelve como máximo ${MAX_IMPORTED_TRANSACTIONS} movimientos, en orden cronológico.
- amount_cents siempre es un entero positivo en céntimos de EUR.
- Los consumos, compras, comisiones e impuestos son expense. Abonos, devoluciones e ingresos son income.
- Ignora saldo anterior/final, límites, totales, subtotales, cuotas pendientes y el pago del resumen de tarjeta: no son compras nuevas.
- No inventes filas ni completes datos ilegibles. Cuenta esas filas en omitted_rows.
- Usa la fecha de cada operación en formato YYYY-MM-DD. Si el año solo aparece en el encabezado, aplícalo a las filas correspondientes.
- Si el contexto del usuario indica un mes o período, incluye únicamente movimientos de ese período; si no indica ninguno, usa todo el período del extracto.
- Usa únicamente uno de estos nombres exactos de categoría, respetando el tipo: ${JSON.stringify(availableCategories)}.
- Si ninguna categoría específica corresponde, usa "Otros" para expense u "Otros ingresos" para income.
- Descripciones breves, reconocibles y sin números completos de tarjeta o cuenta.
- Si el documento es un ticket o recibo que lista productos individuales (por ejemplo la foto de un ticket de supermercado), agrega en esa transacción un array "items" con cada producto: description (nombre breve del producto) y amount_cents (céntimos, entero positivo). Usa únicamente una de estas subcategorías exactas para cada item: ${JSON.stringify(ITEM_SUBCATEGORIES)}.
- Si el documento es un extracto bancario, resumen de tarjeta o listado de movimientos sin líneas de producto individuales, deja "items" como null.
- La suma de los items no tiene por qué coincidir exactamente con el total de la transacción si hay descuentos o redondeos.
Contexto opcional escrito por el usuario: ${JSON.stringify(file.caption ?? "")}.
Nombre del archivo: ${JSON.stringify(file.fileName)}.`;

  // "high" detail costs more tokens than "low" but "low" forces OpenAI to downsample the image
  // to ~512px internally regardless of what we send — receipts with small print need the detail.
  const attachment: ResponseInputContent = imageMimeTypes.has(resolvedMimeType(file.fileName,file.mimeType))
    ? { type: "input_image", image_url: dataUrl(file), detail: "high" }
    : { type: "input_file", filename: file.fileName, file_data: dataUrl(file), ...(extensionOf(file.fileName) === "pdf" ? { detail: "high" as const } : {}) };
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.responses.parse({
    model: process.env.OPENAI_MODEL ?? "gpt-5.6-luna",
    reasoning: { effort: "none" },
    store: false,
    input: [{ role: "user", content: [attachment, { type: "input_text", text: prompt }] }],
    text: { format: zodTextFormat(extractionSchema, "statement_transactions") },
  });
  const parsed = extractionSchema.safeParse(response.output_parsed);
  if (!parsed.success) throw new Error("No pude interpretar el documento con seguridad");
  return { ...parsed.data, transactions: normalizeImportedTransactions(parsed.data.transactions, availableCategories) };
}

function normalizeImportedTransactions(
  rawTransactions: z.infer<typeof importedTransactionSchema>[],
  availableCategories: { name: string; kind: string }[],
) {
  const allowed = new Set(availableCategories.map(category => `${category.kind}:${normalize(category.name)}`));
  const seen = new Set<string>();
  return rawTransactions.flatMap(transaction => {
    const fallback = transaction.type === "expense" ? "Otros" : "Otros ingresos";
    const category = allowed.has(`${transaction.type}:${normalize(transaction.category)}`) ? transaction.category : fallback;
    const items = transaction.items?.length
      ? transaction.items.slice(0, MAX_ITEMS_PER_TRANSACTION).map(item => ({ ...item, subcategory: normalizeItemSubcategory(item.subcategory) }))
      : undefined;
    const normalizedTransaction = { ...transaction, category, items };
    const key = `${transaction.type}|${transaction.transaction_date}|${transaction.amount_cents}|${normalize(transaction.description)}`;
    if (seen.has(key)) return [];
    seen.add(key);
    return [normalizedTransaction];
  });
}

const revisionSchema = z.object({ transactions: z.array(importedTransactionSchema).max(MAX_IMPORTED_TRANSACTIONS) });

// Applies a free-text correction ("el segundo producto son 30€, no 25€") to an already-extracted
// preview, without re-reading the original file — cheaper and fast enough for a chat back-and-forth.
export async function reviseStatementImport(
  transactions: z.infer<typeof importedTransactionSchema>[],
  instruction: string,
  categories: { name: string; kind: string }[],
) {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY no está configurada");
  const availableCategories = categories.filter(category => category.kind === "expense" || category.kind === "income");
  const prompt = `Este es el resultado de una extracción de movimientos de un ticket o extracto:
${JSON.stringify(transactions)}

El usuario pidió esta corrección: ${JSON.stringify(instruction)}

Devuelve el mismo array de movimientos (mismo formato: type, amount_cents, description, category, transaction_date, items opcional con description/amount_cents/subcategory), aplicando ÚNICAMENTE la corrección pedida. No inventes ni cambies nada que el usuario no haya mencionado. Si la corrección es ambigua o no corresponde a ningún movimiento de la lista, deja los movimientos sin cambios.
Categorías disponibles: ${JSON.stringify(availableCategories)}. Subcategorías de producto disponibles: ${JSON.stringify(ITEM_SUBCATEGORIES)}.`;
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.responses.parse({
    model: process.env.OPENAI_MODEL ?? "gpt-5.6-luna",
    reasoning: { effort: "none" },
    store: false,
    input: [{ role: "user", content: prompt }],
    text: { format: zodTextFormat(revisionSchema, "statement_revision") },
  });
  const parsed = revisionSchema.safeParse(response.output_parsed);
  if (!parsed.success) throw new Error("No pude interpretar esa corrección");
  return normalizeImportedTransactions(parsed.data.transactions, availableCategories);
}

function euros(cents: number) {
  return (cents / 100).toLocaleString("es-ES", { style: "currency", currency: "EUR" });
}

export function statementPreview(payload: StatementImportPayload, accounts: { name: string }[]) {
  const expenses = payload.transactions.filter(item => item.type === "expense").reduce((sum, item) => sum + item.amount_cents, 0);
  const income = payload.transactions.filter(item => item.type === "income").reduce((sum, item) => sum + item.amount_cents, 0);
  // Only mention the sides that actually have movements — a pure-expense receipt shouldn't say
  // "0,00 € en ingresos".
  const totalsParts = [expenses ? `${euros(expenses)} en gastos` : null, income ? `${euros(income)} en ingresos` : null].filter(Boolean);
  const totals = `Encontré ${payload.transactions.length} ${payload.transactions.length === 1 ? "movimiento" : "movimientos"}${totalsParts.length ? `: ${totalsParts.join(" y ")}.` : "."}`;
  const examples = payload.transactions.slice(0, 6).map(item => {
    const header = `• ${item.transaction_date} · ${item.description} · ${euros(item.amount_cents)}`;
    if (!item.items?.length) return header;
    const lines = item.items.map(product => `   - ${product.description} · ${euros(product.amount_cents)} · ${product.subcategory}`).join("\n");
    return `${header}\n${lines}`;
  }).join("\n");
  const omitted = payload.omitted_rows ? `\nOmití ${payload.omitted_rows} filas que no eran movimientos o no se leían con seguridad.` : "";
  const accountQuestion = payload.account_name
    ? `\nCuenta: ${payload.account_name}. Responde “sí” para registrar todo, cuéntame qué corregir, o “no” para cancelar.`
    : `\n¿En qué cuenta los registro?\n${accounts.map((account, index) => `${index + 1}. ${account.name}`).join("\n")}\nResponde con el número o el nombre.`;
  return `${totals}${omitted}\n\nVista previa:\n${examples}${payload.transactions.length > 6 ? "\n…" : ""}${accountQuestion}`;
}

export async function executeStatementImport(db: SupabaseClient, userId: string, householdId: string, rawPayload: unknown) {
  const payload = statementImportPayloadSchema.parse(rawPayload);
  if (!payload.account_name) throw new Error("Falta seleccionar la cuenta para la importación");
  let accountQuery=db.from("accounts").select("id,name").eq("household_id", householdId).eq("name", payload.account_name).eq("is_shared", payload.scope === "shared").is("archived_at", null);
  if(payload.scope==="personal")accountQuery=accountQuery.eq("owner_user_id",userId);
  const { data: account, error: accountError } = await accountQuery.maybeSingle();
  if (accountError) throw accountError;
  if (!account) throw new Error("La cuenta elegida ya no está disponible");
  const { data: categories, error: categoryError } = await db.from("categories").select("id,name,kind").or(`household_id.eq.${householdId},household_id.is.null`);
  if (categoryError) throw categoryError;
  const categoryIds = new Map((categories ?? []).map(category => [`${category.kind}:${normalize(category.name)}`, category.id]));
  const dates = payload.transactions.map(item => item.transaction_date).sort();
  const { data: existing, error: existingError } = await db.from("transactions").select("type,amount_cents,description,transaction_date").eq("household_id", householdId).eq("account_id", account.id).eq("created_by", userId).eq("status", "confirmed").gte("transaction_date", dates[0]).lte("transaction_date", dates[dates.length - 1]);
  if (existingError) throw existingError;
  const existingKeys = new Set((existing ?? []).map(item => `${item.type}|${item.transaction_date}|${item.amount_cents}|${normalize(decryptField(item.description))}`));
  const pending = payload.transactions.filter(item => !existingKeys.has(`${item.type}|${item.transaction_date}|${item.amount_cents}|${normalize(item.description)}`));
  let created = 0; let failed = 0;
  for (let index = 0; index < pending.length; index += 5) {
    const results = await Promise.all(pending.slice(index, index + 5).map(async item => {
      const categoryId = categoryIds.get(`${item.type}:${normalize(item.category)}`) ?? categoryIds.get(`${item.type}:${normalize(item.type === "expense" ? "Otros" : "Otros ingresos")}`);
      if (!categoryId) return false;
      const { data: transactionId, error } = await db.rpc("create_financial_transaction_as_user", { p_actor_user_id: userId, p_household_id: householdId, p_account_id: account.id, p_type: item.type, p_amount_cents: item.amount_cents, p_description: encryptField(item.description), p_category_id: categoryId, p_scope: payload.scope, p_privacy: payload.scope === "shared" ? "visible" : "private", p_transaction_date: item.transaction_date, p_paid_by: userId, p_source: "telegram" });
      if (error || !transactionId) return false;
      if (item.items?.length) {
        const { error: itemsError } = await db.from("transaction_items").insert(
          item.items.map(product => ({ transaction_id: transactionId, description: encryptField(product.description), amount_cents: product.amount_cents, subcategory: product.subcategory })),
        );
        // The transaction itself is already created correctly; losing the item breakdown isn't
        // worth failing the whole import over, so this is logged rather than counted as failed.
        if (itemsError) console.error("Failed to insert transaction items", itemsError);
      }
      return true;
    }));
    created += results.filter(Boolean).length; failed += results.filter(result => !result).length;
  }
  return { created, duplicates: payload.transactions.length - pending.length, failed, accountName: account.name };
}
