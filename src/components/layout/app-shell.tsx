import Link from "next/link";
import { BarChart3, Bot, CircleDollarSign, CreditCard, Home, LogOut, Settings, UsersRound } from "lucide-react";
import { logout } from "@/app/(auth)/actions";

const nav = [
  ["Resumen", "/app", Home], ["Movimientos", "/app/movimientos", CircleDollarSign],
  ["Cuentas", "/app/cuentas", CreditCard], ["Balance", "/app/balance", BarChart3],
  ["Asistente", "/app/asistente", Bot], ["Ajustes", "/app/ajustes", Settings],
] as const;

export function AppShell({ children, householdName }: { children: React.ReactNode; householdName: string }) {
  return <div className="min-h-screen bg-[#f6f4ec] md:grid md:grid-cols-[240px_1fr]">
    <aside className="hidden border-r border-black/5 bg-[#19342f] p-5 text-white md:flex md:flex-col"><Link href="/app" className="flex items-center gap-2 text-lg font-black"><span className="grid size-9 place-items-center rounded-xl bg-[#f5b8a5] text-[#19342f]">a</span>A medias</Link><div className="mt-8 flex items-center gap-3 rounded-2xl bg-white/8 p-3"><span className="grid size-9 place-items-center rounded-xl bg-white/10"><UsersRound size={18}/></span><div><p className="text-xs text-white/60">Hogar</p><p className="text-sm font-bold">{householdName}</p></div></div><nav className="mt-7 space-y-1">{nav.map(([label,href,Icon])=><Link key={href} href={href} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-white/75 hover:bg-white/10 hover:text-white"><Icon size={19}/>{label}</Link>)}</nav><form action={logout} className="mt-auto"><button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/60 hover:bg-white/10"><LogOut size={18}/>Cerrar sesión</button></form></aside>
    <div className="min-w-0 pb-24 md:pb-0"><header className="flex items-center justify-between border-b border-black/5 bg-[#f6f4ec]/90 px-5 py-4 backdrop-blur md:px-8"><Link href="/app" className="font-black md:hidden">A medias</Link><p className="hidden text-sm font-bold text-[#6c7f7a] md:block">{householdName}</p><div className="grid size-9 place-items-center rounded-full bg-[#dceee6] text-sm font-black">♡</div></header><main className="mx-auto max-w-7xl p-5 md:p-8">{children}</main></div>
    <nav className="fixed inset-x-3 bottom-3 z-20 flex justify-around rounded-2xl bg-[#19342f] px-2 py-2 text-white shadow-2xl md:hidden">{nav.slice(0,5).map(([label,href,Icon])=><Link key={href} href={href} className="flex min-w-12 flex-col items-center gap-1 rounded-xl p-2 text-[10px] text-white/75"><Icon size={19}/>{label}</Link>)}</nav>
  </div>;
}
