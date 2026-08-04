import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { getCurrentHousehold } from "@/lib/household";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { household, supabase, user } = await getCurrentHousehold();
  if (!household) redirect("/onboarding");
  const {data:profile}=await supabase.from("profiles").select("personal_space_name").eq("id",user.id).maybeSingle();
  return <AppShell householdName={household.name} personalSpaceName={profile?.personal_space_name??"Mi espacio"}>{children}</AppShell>;
}
