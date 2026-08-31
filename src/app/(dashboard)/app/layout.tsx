import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { getCurrentHousehold } from "@/lib/household";
import { decryptField } from "@/lib/security/field-encryption";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { household, supabase, user } = await getCurrentHousehold();
  if (!household) redirect("/onboarding");
  const [{data:profile},{data:pendingNotification}]=await Promise.all([
    supabase.from("profiles").select("personal_space_name, display_name").eq("id",user.id).maybeSingle(),
    supabase.from("trial_notification_deliveries").select("id,notification_key").eq("user_id",user.id).eq("channel","in_app").eq("status","sent").is("seen_at",null).order("created_at",{ascending:false}).limit(1).maybeSingle(),
  ]);
  const userName = profile?.display_name ? decryptField(profile.display_name) : (user.email ?? "Tu cuenta");
  // Only Google (or another OAuth provider) accounts carry this — email/password sign-ups have no
  // avatar_url, which is exactly when UserBadge falls back to a plain icon.
  const userAvatarUrl = (user.user_metadata?.avatar_url as string | undefined) ?? (user.user_metadata?.picture as string | undefined) ?? null;
  return (
    <AppShell
      householdName={household.name}
      personalSpaceName={profile?.personal_space_name??"Mi espacio"}
      trialNotification={pendingNotification ? { id: pendingNotification.id, notificationKey: pendingNotification.notification_key } : null}
      userName={userName}
      userAvatarUrl={userAvatarUrl}
    >
      {children}
    </AppShell>
  );
}
