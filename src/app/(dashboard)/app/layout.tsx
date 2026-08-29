import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { getCurrentHousehold } from "@/lib/household";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { household, supabase, user } = await getCurrentHousehold();
  if (!household) redirect("/onboarding");
  const [{data:profile},{data:pendingNotification}]=await Promise.all([
    supabase.from("profiles").select("personal_space_name").eq("id",user.id).maybeSingle(),
    supabase.from("trial_notification_deliveries").select("id,notification_key").eq("user_id",user.id).eq("channel","in_app").eq("status","sent").is("seen_at",null).order("created_at",{ascending:false}).limit(1).maybeSingle(),
  ]);
  return (
    <AppShell
      householdName={household.name}
      personalSpaceName={profile?.personal_space_name??"Mi espacio"}
      trialNotification={pendingNotification ? { id: pendingNotification.id, notificationKey: pendingNotification.notification_key } : null}
    >
      {children}
    </AppShell>
  );
}
