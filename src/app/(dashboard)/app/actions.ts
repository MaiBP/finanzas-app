"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eurosToCents } from "@/lib/finance/money";
import { getCurrentHousehold } from "@/lib/household";
import { transactionSchema } from "@/lib/validations/transaction";
import { encryptField } from "@/lib/security/field-encryption";
import { SYNTHETIC_BALANCE_CATEGORY } from "@/lib/finance/synthetic-transactions";

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
  if (error) return { error: error.message };

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
  if (error) redirect(`${returnTo}?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/app"); revalidatePath("/app/movimientos"); revalidatePath("/app/personal"); revalidatePath("/app/personal/movimientos"); revalidatePath("/app/personal/cuentas");
}
