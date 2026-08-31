import Link from "next/link";
import Image from "next/image";
import { BarChart3, Bot, CircleDollarSign, CreditCard, Home, LogOut, Settings, UserRound } from "lucide-react";
import { logout } from "@/app/(auth)/actions";
import { AppContextLabel } from "@/components/layout/app-context-label";
import { SectionSurface } from "@/components/layout/section-surface";
import { NavLink } from "@/components/layout/nav-link";
import { MobileNavDrawer } from "@/components/layout/mobile-nav-drawer";
import { PageTransition } from "@/components/layout/page-transition";
import { TrialBanner } from "@/components/layout/trial-banner";

const householdNav = [
  { href: "/app", label: "Resumen", icon: Home },
  { href: "/app/movimientos", label: "Movimientos", icon: CircleDollarSign },
  { href: "/app/cuentas", label: "Cuentas", icon: CreditCard },
  { href: "/app/balance", label: "Balance", icon: BarChart3 },
] as const;

const personalNav = [
  { href: "/app/personal", label: "Resumen", icon: UserRound },
  { href: "/app/personal/movimientos", label: "Movimientos", icon: CircleDollarSign },
  { href: "/app/personal/cuentas", label: "Cuentas", icon: CreditCard },
] as const;
// Distinct labels from personalNav's: the mobile bar flattens household + personal into one row
// with no group headers, so "Movimientos" appearing twice (household vs. personal) would be
// ambiguous the way it isn't in the sidebar, where the "Personal" box header disambiguates it.
const personalMobileNav = [
  { href: "/app/personal", label: "Mi resumen", icon: UserRound },
  { href: "/app/personal/movimientos", label: "Mis movimientos", icon: CircleDollarSign },
  { href: "/app/personal/cuentas", label: "Mis cuentas", icon: CreditCard },
] as const;
const generalNav = [
  { href: "/app/asistente", label: "Asistente", icon: Bot },
  { href: "/app/ajustes", label: "Ajustes", icon: Settings },
] as const;

export function AppShell({
  children,
  householdName,
  personalSpaceName,
  trialNotification,
}: {
  children: React.ReactNode;
  householdName: string;
  personalSpaceName: string;
  trialNotification?: { id: string; notificationKey: string } | null;
}) {
  return (
    <div className="min-h-screen bg-white text-(--ink) md:grid md:grid-cols-[260px_1fr]">
      <aside className="hidden border-r border-(--ink)/25 bg-white p-5 text-(--ink) md:flex md:flex-col">
        <Link href="/app" className="flex items-center">
          <Image src="/logo-mitimiti.png" alt="Miti-Miti" width={64} height={64} className="size-16 object-contain" />
        </Link>

        <div className="mt-8 rounded-2xl border border-(--ink)/15 p-3">
          <div className="flex items-center gap-3 px-2 pb-2">
            <span className="grid size-9 place-items-center rounded-full">
              <Image src="/home.png" alt="" width={28} height={28} className="size-6 object-contain" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-wider text-(--muted)">Hogar</p>
              <p className="truncate text-sm font-black">{householdName}</p>
            </div>
          </div>
          <nav className="mt-1 space-y-1">
            {householdNav.map((item) => (
              <NavLink key={item.href} href={item.href} label={item.label} icon={<item.icon size={19} />} />
            ))}
          </nav>
        </div>

        <div className="mt-4 rounded-2xl border border-(--ink)/15 p-3">
          <div className="flex items-center gap-3 px-2 pb-2">
            <span className="grid size-9 place-items-center rounded-full">
              <Image src="/private.png" alt="" width={28} height={28} className="size-6 object-contain" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-wider text-(--muted)">Personal</p>
              <p className="truncate text-sm font-black">{personalSpaceName}</p>
            </div>
          </div>
          <nav className="mt-1 space-y-1">
            {personalNav.map((item) => (
              <NavLink key={item.href} href={item.href} label={item.label} icon={<item.icon size={19} />} />
            ))}
          </nav>
        </div>

        <div className="mt-6">
          <p className="px-3 text-[10px] font-black uppercase tracking-wider text-(--muted)">General</p>
          <nav className="mt-2 space-y-1">
            {generalNav.map((item) => (
              <NavLink key={item.href} href={item.href} label={item.label} icon={<item.icon size={19} />} />
            ))}
          </nav>
        </div>

        <form action={logout} className="mt-auto">
          <button className="flex w-full items-center gap-3 rounded-full px-3 py-2.5 text-sm text-(--muted) hover:bg-(--highlight) hover:text-(--ink)">
            <LogOut size={18} />
            Cerrar sesión
          </button>
        </form>
      </aside>

      <SectionSurface>
        {trialNotification && <TrialBanner id={trialNotification.id} notificationKey={trialNotification.notificationKey} />}
        <header className="section-header sticky top-0 z-10 grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-(--ink)/30 px-5 py-4 backdrop-blur md:px-8">
          <div className="flex items-center gap-3">
            <MobileNavDrawer
              householdNav={householdNav.map((item) => ({ href: item.href, label: item.label, icon: <item.icon size={19} /> }))}
              personalNav={personalMobileNav.map((item) => ({ href: item.href, label: item.label, icon: <item.icon size={19} /> }))}
              generalNav={generalNav.map((item) => ({ href: item.href, label: item.label, icon: <item.icon size={19} /> }))}
              householdName={householdName}
              personalSpaceName={personalSpaceName}
              logout={logout}
            />
            <AppContextLabel householdName={householdName} personalSpaceName={personalSpaceName} />
          </div>
          <Link href="/app" className="hidden items-center justify-self-center md:flex">
            <Image src="/logo-mitimiti.png" alt="Miti-Miti" width={56} height={56} className="size-14 object-contain" />
          </Link>
          <Link href="/app" className="flex items-center justify-self-end md:hidden">
            <Image src="/logo-mitimiti.png" alt="Miti-Miti" width={36} height={36} className="size-9 object-contain" />
          </Link>
        </header>
        <main className="mx-auto max-w-7xl p-5 md:p-8">
          <PageTransition>{children}</PageTransition>
        </main>
      </SectionSurface>
    </div>
  );
}
