import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { getCurrentHousehold } from "@/lib/household";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { household } = await getCurrentHousehold();
  if (!household) redirect("/onboarding");
  return <AppShell householdName={household.name}>{children}</AppShell>;
}
