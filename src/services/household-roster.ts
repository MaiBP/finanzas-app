import { decryptField } from "@/lib/security/field-encryption";

type DbClient = { from: (table: string) => ReturnType<import("@supabase/supabase-js").SupabaseClient["from"]> };

export type RosterMember = { userId: string; displayName: string };

type MemberRow = { user_id: string; profiles: { display_name: string | null } | null };

export async function getHouseholdRoster(db: DbClient, householdId: string): Promise<RosterMember[]> {
  const { data, error } = await db.from("household_members").select("user_id,profiles(display_name)").eq("household_id", householdId);
  if (error) throw error;
  return ((data ?? []) as unknown as MemberRow[]).map((member) => ({
    userId: member.user_id,
    displayName: member.profiles?.display_name ? decryptField(member.profiles.display_name) : "Miembro",
  }));
}
