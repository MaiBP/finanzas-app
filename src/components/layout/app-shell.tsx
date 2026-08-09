import Link from "next/link";
import { BarChart3, Bot, CircleDollarSign, CreditCard, Home, LogOut, Settings, UserRound, UsersRound } from "lucide-react";
import { logout } from "@/app/(auth)/actions";
import { AppContextLabel } from "@/components/layout/app-context-label";
import { SectionSurface } from "@/components/layout/section-surface";
import { NavLink } from "@/components/layout/nav-link";

const householdNav = [
  { href: "/app", label: "Resumen", icon: Home },
  { href: "/app/movimientos", label: "Movimientos", icon: CircleDollarSign },
  { href: "/app/cuentas", label: "Cuentas", icon: CreditCard },
  { href: "/app/balance", label: "Balance", icon: BarChart3 },
] as const;

const personalNav = [{ href: "/app/personal", label: "Resumen personal", icon: UserRound }] as const;
const generalNav = [
  { href: "/app/asistente", label: "Asistente", icon: Bot },
  { href: "/app/ajustes", label: "Ajustes", icon: Settings },
] as const;
const mobileNav = [
  ...householdNav,
  { href: "/app/personal", label: "Personal", icon: UserRound } as const,
  ...generalNav,
];

export function AppShell({
  children,
  householdName,
  personalSpaceName,
}: {
  children: React.ReactNode;
  householdName: string;
  personalSpaceName: string;
}) {
  return (
    <div className="min-h-screen bg-white text-(--ink) md:grid md:grid-cols-[260px_1fr]">
      <aside className="hidden border-r border-(--ink)/25 bg-white p-5 text-(--ink) md:flex md:flex-col">
        <Link href="/app" className="flex items-center gap-2 text-lg font-black uppercase">
          <span className="grid size-10 place-items-center rounded-full bg-(--highlight) text-xl">½</span>
          Miti-Miti
        </Link>

        <div className="mt-8 rounded-2xl border border-(--ink)/15 p-3">
          <div className="flex items-center gap-3 px-2 pb-2">
            <span className="grid size-9 place-items-center rounded-full bg-(--lilac)">
              <UsersRound size={18} />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-wider text-(--muted)">Hogar</p>
              <p className="truncate text-sm font-black">{householdName}</p>
            </div>
          </div>
          <nav className="mt-1 space-y-1">
            {householdNav.map((item) => (
              <NavLink key={item.href} {...item} />
            ))}
          </nav>
        </div>

        <div className="mt-4 rounded-2xl border border-(--ink)/15 p-3">
          <div className="flex items-center gap-3 px-2 pb-2">
            <span className="grid size-9 place-items-center rounded-full bg-(--lime)">
              <UserRound size={18} />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-wider text-(--muted)">Personal</p>
              <p className="truncate text-sm font-black">{personalSpaceName}</p>
            </div>
          </div>
          <nav className="mt-1 space-y-1">
            {personalNav.map((item) => (
              <NavLink key={item.href} {...item} />
            ))}
          </nav>
        </div>

        <div className="mt-6">
          <p className="px-3 text-[10px] font-black uppercase tracking-wider text-(--muted)">General</p>
          <nav className="mt-2 space-y-1">
            {generalNav.map((item) => (
              <NavLink key={item.href} {...item} />
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
        <header className="section-header sticky top-0 z-10 flex items-center justify-between border-b border-(--ink)/30 px-5 py-4 backdrop-blur md:px-8">
          <Link href="/app" className="font-black uppercase md:hidden">
            Miti-Miti
          </Link>
          <AppContextLabel householdName={householdName} personalSpaceName={personalSpaceName} />
          <div className="grid size-9 place-items-center rounded-full bg-white text-sm font-black">½</div>
        </header>
        <main className="mx-auto max-w-7xl p-5 md:p-8">{children}</main>
      </SectionSurface>

      <nav className="fixed inset-x-3 bottom-3 z-20 flex overflow-x-auto rounded-full border border-(--ink)/20 bg-white px-2 py-2 text-(--ink) shadow-2xl md:hidden">
        {mobileNav.map((item) => (
          <NavLink key={item.href} {...item} variant="mobile" />
        ))}
      </nav>
    </div>
  );
}
