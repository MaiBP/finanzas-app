"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/household";

export async function dismissTrialNotification(id: string) {
  const { supabase } = await requireUser();
  await supabase.from("trial_notification_deliveries").update({ seen_at: new Date().toISOString() }).eq("id", id);
  revalidatePath("/app", "layout");
}
