"use client";

import { usePathname } from "next/navigation";

function getSectionTheme(pathname: string) {
  if (pathname.startsWith("/app/movimientos")) return "section-pink";
  if (pathname.startsWith("/app/cuentas")) return "section-blue";
  if (pathname.startsWith("/app/balance")) return "section-lime";
  if (pathname.startsWith("/app/asistente")) return "section-lilac";
  if (pathname.startsWith("/app/ajustes")) return "section-yellow";
  return "section-orange";
}

export function SectionSurface({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return <div className={`section-surface min-w-0 pb-24 md:pb-0 ${getSectionTheme(pathname)}`}>{children}</div>;
}
