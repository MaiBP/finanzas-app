"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { LogOut, Menu, X } from "lucide-react";
import { NavLink } from "@/components/layout/nav-link";

type NavItem = { href: string; label: string; icon: React.ReactNode };

export function MobileNavDrawer({
  householdNav,
  personalNav,
  generalNav,
  householdName,
  personalSpaceName,
  logout,
}: {
  householdNav: NavItem[];
  personalNav: NavItem[];
  generalNav: NavItem[];
  householdName: string;
  personalSpaceName: string;
  logout: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Route changes only happen via a nav link, so this is the one signal that means "close me".
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir menú"
        className="grid size-10 place-items-center rounded-full border border-(--ink)/20 bg-white"
      >
        <Menu size={20} />
      </button>

      {open && (
        <div className="fixed inset-0 z-30">
          <button type="button" aria-label="Cerrar menú" className="absolute inset-0 bg-(--ink)/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-[82%] max-w-xs overflow-y-auto border-r border-(--ink)/25 bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <Image src="/logo-mitimiti.png" alt="Miti-Miti" width={44} height={44} className="size-11 object-contain" />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Cerrar menú"
                className="grid size-9 place-items-center rounded-full hover:bg-(--highlight)"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mt-6 rounded-2xl border border-(--ink)/15 p-3">
              <div className="flex items-center gap-3 px-2 pb-2">
                <span className="grid size-9 place-items-center rounded-full bg-(--lilac)">
                  <Image src="/home.png" alt="" width={28} height={28} className="size-6 object-contain" />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-wider text-(--muted)">Hogar</p>
                  <p className="truncate text-sm font-black">{householdName}</p>
                </div>
              </div>
              <nav className="mt-1 space-y-1">
                {householdNav.map((item) => (
                  <NavLink key={item.href} href={item.href} label={item.label} icon={item.icon} />
                ))}
              </nav>
            </div>

            <div className="mt-4 rounded-2xl border border-(--ink)/15 p-3">
              <div className="flex items-center gap-3 px-2 pb-2">
                <span className="grid size-9 place-items-center rounded-full bg-(--lime)">
                  <Image src="/private.png" alt="" width={28} height={28} className="size-6 object-contain" />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-wider text-(--muted)">Personal</p>
                  <p className="truncate text-sm font-black">{personalSpaceName}</p>
                </div>
              </div>
              <nav className="mt-1 space-y-1">
                {personalNav.map((item) => (
                  <NavLink key={item.href} href={item.href} label={item.label} icon={item.icon} />
                ))}
              </nav>
            </div>

            <div className="mt-6">
              <p className="px-3 text-[10px] font-black uppercase tracking-wider text-(--muted)">General</p>
              <nav className="mt-2 space-y-1">
                {generalNav.map((item) => (
                  <NavLink key={item.href} href={item.href} label={item.label} icon={item.icon} />
                ))}
              </nav>
            </div>

            <form action={logout} className="mt-6">
              <button className="flex w-full items-center gap-3 rounded-full px-3 py-2.5 text-sm text-(--muted) hover:bg-(--highlight) hover:text-(--ink)">
                <LogOut size={18} />
                Cerrar sesión
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
