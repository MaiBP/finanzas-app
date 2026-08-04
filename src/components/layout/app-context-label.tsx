"use client";

import { usePathname } from "next/navigation";

export function AppContextLabel({ householdName, personalSpaceName }: { householdName: string; personalSpaceName: string }) {
  const pathname = usePathname();
  const label = pathname.startsWith("/app/personal") ? `Personal · ${personalSpaceName}` : pathname.startsWith("/app/asistente") ? "Asistente · Todos los espacios" : pathname.startsWith("/app/ajustes") ? "Ajustes generales" : `Hogar · ${householdName}`;
  return <p className="hidden text-sm font-bold uppercase md:block">{label}</p>;
}
