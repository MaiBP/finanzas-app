import Link from "next/link";
import { BarChart3, Bot, CircleDollarSign, CreditCard, Home, LogOut, Settings, UsersRound } from "lucide-react";
import { logout } from "@/app/(auth)/actions";

const nav = [
  ["Resumen", "/app", Home], ["Movimientos", "/app/movimientos", CircleDollarSign],
  ["Cuentas", "/app/cuentas", CreditCard], ["Balance", "/app/balance", BarChart3],
  ["Asistente", "/app/asistente", Bot], ["Ajustes", "/app/ajustes", Settings],
] as const;

export function AppShell({ children, householdName }: { children: React.ReactNode; householdName: string }) {
  return <div className="min-h-screen bg-[#ff9655] text-[#3a3434] md:grid md:grid-cols-[240px_1fr]">
    <aside className="hidden border-r border-[#3a3434] bg-[#3a3434] p-5 text-white md:flex md:flex-col">
      <Link href="/app" className="flex items-center gap-2 text-lg font-black uppercase"><span className="grid size-10 place-items-center rounded-full bg-[#ffff50] text-[#3a3434]">a</span>A medias</Link>
      <div className="mt-8 flex items-center gap-3 border-y border-white/20 py-4"><span className="grid size-9 place-items-center rounded-full bg-[#ff96be] text-[#3a3434]"><UsersRound size={18}/></span><div><p className="text-xs uppercase text-white/60">Hogar</p><p className="text-sm font-bold">{householdName}</p></div></div>
      <nav className="mt-7 space-y-1">{nav.map(([label,href,Icon])=><Link key={href} href={href} className="flex items-center gap-3 rounded-full px-3 py-2.5 text-sm font-semibold text-white/75 hover:bg-[#ffff50] hover:text-[#3a3434]"><Icon size={19}/>{label}</Link>)}</nav>
      <form action={logout} className="mt-auto"><button className="flex w-full items-center gap-3 rounded-full px-3 py-2.5 text-sm text-white/60 hover:bg-white/10"><LogOut size={18}/>Cerrar sesión</button></form>
    </aside>
    <div className="min-w-0 pb-24 md:pb-0">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-[#3a3434]/30 bg-[#ff9655]/90 px-5 py-4 backdrop-blur md:px-8"><Link href="/app" className="font-black uppercase md:hidden">A medias</Link><p className="hidden text-sm font-bold uppercase md:block">{householdName}</p><div className="grid size-9 place-items-center rounded-full bg-[#ffff50] text-sm font-black">♡</div></header>
      <main className="mx-auto max-w-7xl p-5 md:p-8">{children}</main>
    </div>
    <nav className="fixed inset-x-3 bottom-3 z-20 flex justify-around rounded-full bg-[#3a3434] px-2 py-2 text-white shadow-2xl md:hidden">{nav.slice(0,5).map(([label,href,Icon])=><Link key={href} href={href} className="flex min-w-12 flex-col items-center gap-1 rounded-full p-2 text-[10px] text-white/75 hover:bg-[#ffff50] hover:text-[#3a3434]"><Icon size={19}/>{label}</Link>)}</nav>
  </div>;
}
