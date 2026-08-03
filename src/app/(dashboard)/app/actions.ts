"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eurosToCents } from "@/lib/finance/money";
import { getCurrentHousehold } from "@/lib/household";
import { transactionSchema } from "@/lib/validations/transaction";

export type ActionState = { error?: string; success?: string };

export async function createTransaction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const context = await getCurrentHousehold();
  if (!context.household) return { error: "Primero debes pertenecer a un hogar." };
  const parsed = transactionSchema.safeParse({
    description: formData.get("description"), amount: formData.get("amount"), type: formData.get("type"),
    scope: formData.get("scope"), privacy: formData.get("privacy"), accountId: formData.get("accountId"),
    categoryId: formData.get("categoryId"), transactionDate: formData.get("transactionDate"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revisa los datos" };
  let amountCents: number;
  try { amountCents = eurosToCents(parsed.data.amount); } catch (error) { return { error: error instanceof Error ? error.message : "Importe no válido" }; }

  const { supabase, user, household } = context;
  const [{ data: account }, { data: category }] = await Promise.all([
    supabase.from("accounts").select("id").eq("id", parsed.data.accountId).eq("household_id", household.id).is("archived_at", null).maybeSingle(),
    supabase.from("categories").select("id, kind").eq("id", parsed.data.categoryId).or(`household_id.eq.${household.id},household_id.is.null`).maybeSingle(),
  ]);
  if (!account) return { error: "La cuenta no pertenece a tu hogar o está archivada." };
  if (!category || category.kind !== parsed.data.type) return { error: "La categoría no coincide con el tipo de movimiento." };
  const { error } = await supabase.rpc("create_financial_transaction", {
    p_household_id: household.id, p_account_id: parsed.data.accountId, p_type: parsed.data.type,
    p_amount_cents: amountCents, p_description: parsed.data.description, p_category_id: parsed.data.categoryId,
    p_scope: parsed.data.scope, p_privacy: parsed.data.privacy, p_transaction_date: parsed.data.transactionDate,
    p_paid_by: user.id, p_source: "web",
  });
  if (error) return { error: error.message };
  revalidatePath("/app"); revalidatePath("/app/movimientos");
  redirect("/app?created=1");
}

export async function softDeleteTransaction(formData: FormData) {
  const { supabase } = await getCurrentHousehold();
  const id = String(formData.get("id"));
  const { error } = await supabase.rpc("soft_delete_financial_transaction", { p_transaction_id: id });
  if (error) redirect(`/app/movimientos?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/app"); revalidatePath("/app/movimientos");
}
