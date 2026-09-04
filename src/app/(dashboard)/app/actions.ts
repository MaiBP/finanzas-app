"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eurosToCents } from "@/lib/finance/money";
import { getCurrentHousehold } from "@/lib/household";
import { transactionSchema } from "@/lib/validations/transaction";
import { encryptField } from "@/lib/security/field-encryption";
import { SYNTHETIC_BALANCE_CATEGORY } from "@/lib/finance/synthetic-transactions";
import { friendlyRpcError } from "@/lib/trial/errors";
import { decryptField } from "@/lib/security/field-encryption";
import { updateReminder, type ReminderPatch, type ReminderRecord } from "@/services/reminders";

export type ActionState = { error?: string; success?: string };
type FinanceMode = "shared" | "personal";

async function createTransactionForMode(formData: FormData, mode: FinanceMode): Promise<ActionState> {
  const context = await getCurrentHousehold();
  if (!context.household) return { error: "Primero debes pertenecer a un hogar." };

  const parsed = transactionSchema.safeParse({
    description: formData.get("description"), amount: formData.get("amount"), type: formData.get("type"),
    scope: mode, privacy: mode === "shared" ? "visible" : "private", accountId: formData.get("accountId"),
    categoryId: formData.get("categoryId"), transactionDate: formData.get("transactionDate"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revisa los datos" };

  let amountCents: number;
  try { amountCents = eurosToCents(parsed.data.amount); }
  catch (error) { return { error: error instanceof Error ? error.message : "Importe no válido" }; }

  const { supabase, user, household } = context;
  let accountQuery = supabase.from("accounts").select("id").eq("id", parsed.data.accountId).eq("household_id", household.id).is("archived_at", null);
  accountQuery = mode === "shared" ? accountQuery.eq("is_shared", true) : accountQuery.eq("is_shared", false).eq("owner_user_id", user.id);
  const [{ data: account }, { data: category }] = await Promise.all([
    accountQuery.maybeSingle(),
    supabase.from("categories").select("id, kind").eq("id", parsed.data.categoryId).or(`household_id.eq.${household.id},household_id.is.null`).maybeSingle(),
  ]);
  if (!account) return { error: mode === "shared" ? "Selecciona una cuenta conjunta activa." : "Selecciona una cuenta personal tuya." };
  if (!category || category.kind !== parsed.data.type) return { error: "La categoría no coincide con el tipo de movimiento." };

  const { error } = await supabase.rpc("create_financial_transaction", {
    p_household_id: household.id, p_account_id: parsed.data.accountId, p_type: parsed.data.type,
    p_amount_cents: amountCents, p_description: encryptField(parsed.data.description), p_category_id: parsed.data.categoryId,
    p_scope: parsed.data.scope, p_privacy: parsed.data.privacy, p_transaction_date: parsed.data.transactionDate,
    p_paid_by: user.id, p_source: "web",
  });
  if (error) return { error: friendlyRpcError(error.message) };

  revalidatePath("/app"); revalidatePath("/app/movimientos"); revalidatePath("/app/personal"); revalidatePath("/app/personal/movimientos"); revalidatePath("/app/personal/cuentas");
  redirect(mode === "shared" ? "/app?created=1" : "/app/personal?created=1");
}

export async function createTransaction(_state: ActionState, formData: FormData) {
  return createTransactionForMode(formData, "shared");
}

export async function createPersonalTransaction(_state: ActionState, formData: FormData) {
  return createTransactionForMode(formData, "personal");
}

const ALLOWED_DELETE_RETURN_PATHS = ["/app/personal", "/app/personal/movimientos"];

export async function softDeleteTransaction(formData: FormData) {
  const { supabase } = await getCurrentHousehold();
  const id = String(formData.get("id"));
  const requestedReturn = String(formData.get("returnTo") ?? "");
  const returnTo = ALLOWED_DELETE_RETURN_PATHS.includes(requestedReturn) ? requestedReturn : "/app/movimientos";
  const { data: existing } = await supabase.from("transactions").select("categories(name)").eq("id", id).maybeSingle();
  const category = (existing as { categories: { name: string } | null } | null)?.categories;
  if (category?.name === SYNTHETIC_BALANCE_CATEGORY) {
    redirect(`${returnTo}?error=${encodeURIComponent("Este movimiento sostiene el saldo de la cuenta y no se puede eliminar.")}`);
  }
  const { error } = await supabase.rpc("soft_delete_financial_transaction", { p_transaction_id: id });
  if (error) redirect(`${returnTo}?error=${encodeURIComponent(friendlyRpcError(error.message))}`);
  revalidatePath("/app"); revalidatePath("/app/movimientos"); revalidatePath("/app/personal"); revalidatePath("/app/personal/movimientos"); revalidatePath("/app/personal/cuentas");
}

// A reminder is just a note, never a real transaction — RLS already restricts this to whoever
// created it (even a shared reminder can't be deleted by the other partner), so no extra checks
// needed here.
export async function deleteReminder(formData: FormData) {
  const { supabase } = await getCurrentHousehold();
  const id = String(formData.get("id"));
  const { error } = await supabase.from("reminders").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/app"); revalidatePath("/app/recordatorios");
}

// scope and is_recurring are deliberately not editable here — changing what a reminder fundamentally
// is (shared vs personal, monthly vs one-off) is a delete-and-recreate, not an edit.
export async function updateReminderAction(formData: FormData) {
  const { supabase } = await getCurrentHousehold();
  const id = String(formData.get("id"));
  const { data: existing } = await supabase.from("reminders").select("id,description,scope,is_recurring,day_of_month,reminder_date,remind_days_before,amount_cents").eq("id", id).maybeSingle();
  if (!existing) throw new Error("No encuentro ese recordatorio.");
  const reminder: ReminderRecord = { ...existing, description: decryptField(existing.description) };

  const description = String(formData.get("description") ?? "").trim();
  const dayOfMonth = String(formData.get("day_of_month") ?? "").trim();
  const reminderDate = String(formData.get("reminder_date") ?? "").trim();
  const remindDaysBefore = String(formData.get("remind_days_before") ?? "").trim();
  const amount = String(formData.get("amount") ?? "").trim();
  const patch: ReminderPatch = {
    description: description || null,
    day_of_month: dayOfMonth ? Number(dayOfMonth) : null,
    reminder_date: reminderDate || null,
    remind_days_before: remindDaysBefore ? Number(remindDaysBefore) : null,
    amount_cents: amount ? eurosToCents(amount) : null,
  };
  await updateReminder(supabase, reminder, patch);
  revalidatePath("/app"); revalidatePath("/app/recordatorios");
}
