"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

export function NavLink({
  href,
  label,
  icon,
  variant = "sidebar",
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  variant?: "sidebar" | "mobile";
}) {
  const pathname = usePathname();
  // "/app" and "/app/personal" are each another section's own landing page, so they need an
  // exact match — otherwise every personal sub-route (movimientos, cuentas) would also light up
  // "Resumen personal" at the same time as its own nav entry.
  const active = href === "/app" || href === "/app/personal" ? pathname === href : pathname.startsWith(href);

  if (variant === "mobile") {
    return (
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex min-w-16 flex-1 flex-col items-center gap-1 rounded-full p-2 text-[10px] text-(--ink)",
          active ? "bg-(--highlight) font-bold" : "hover:bg-(--highlight)",
        )}
      >
        {icon}
        {label}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-full px-3 py-2.5 text-sm font-semibold",
        active ? "bg-(--ink) text-(--highlight)" : "text-(--ink) hover:bg-(--highlight)",
      )}
    >
      {icon}
      {label}
    </Link>
  );
}
