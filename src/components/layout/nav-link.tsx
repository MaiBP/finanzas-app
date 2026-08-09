"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export function NavLink({
  href,
  label,
  icon: Icon,
  variant = "sidebar",
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  variant?: "sidebar" | "mobile";
}) {
  const pathname = usePathname();
  const active = href === "/app" ? pathname === "/app" : pathname.startsWith(href);

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
        <Icon size={19} />
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
      <Icon size={19} />
      {label}
    </Link>
  );
}
