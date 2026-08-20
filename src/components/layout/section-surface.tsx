"use client";

import { usePathname } from "next/navigation";

function getSectionTheme(pathname: string) {
  // Personal's own Movimientos/Cuentas get the same accent as their household counterparts —
  // same kind of page, different space — so these need to be checked before the generic
  // "/app/personal" catch-all below, which still covers the personal Resumen page itself.
  if (pathname.startsWith("/app/personal/movimientos")) return "section-pink";
  if (pathname.startsWith("/app/personal/cuentas")) return "section-blue";
  if (pathname.startsWith("/app/movimientos")) return "section-pink";
  if (pathname.startsWith("/app/cuentas")) return "section-blue";
  if (pathname.startsWith("/app/personal")) return "section-savings";
  if (pathname.startsWith("/app/balance")) return "section-lilac";
  if (pathname.startsWith("/app/asistente")) return "section-lime";
  if (pathname.startsWith("/app/ajustes")) return "section-yellow";
  return "section-orange";
}

export function SectionSurface({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return <div className={`section-surface min-w-0 ${getSectionTheme(pathname)}`}>{children}</div>;
}
