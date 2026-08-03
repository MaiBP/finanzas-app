import Link from "next/link";
import { ArrowRight, Check, HeartHandshake, MessageCircle, ShieldCheck } from "lucide-react";

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f6f4ec]">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6">
        <div className="flex items-center gap-2 text-lg font-black"><span className="grid size-9 place-items-center rounded-xl bg-[#26725c] text-white">a</span>A medias</div>
        <Link href="/login" className="rounded-full border border-[#cad7d2] px-5 py-2.5 text-sm font-bold">Entrar</Link>
      </nav>
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 md:grid-cols-2 md:py-24">
        <div>
          <p className="mb-5 inline-flex items-center gap-2 rounded-full bg-[#dceee6] px-4 py-2 text-sm font-bold text-[#26725c]"><HeartHandshake size={16}/> El dinero, más fácil entre dos</p>
          <h1 className="max-w-xl text-5xl font-black leading-[1.02] tracking-[-.05em] md:text-7xl">Vuestras cuentas, claras y sin dramas.</h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-[#60736e]">Registrad gastos, repartid lo compartido y entended vuestro mes de un vistazo. Sin hojas imposibles.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/registro" className="flex items-center gap-2 rounded-full bg-[#26725c] px-6 py-3.5 font-bold text-white shadow-lg shadow-green-900/15">Crear vuestro hogar <ArrowRight size={18}/></Link>
            <Link href="/login" className="rounded-full bg-white px-6 py-3.5 font-bold">Ya tengo cuenta</Link>
          </div>
          <div className="mt-10 flex flex-wrap gap-5 text-sm text-[#60736e]">
            <span className="flex gap-2"><Check size={18} className="text-[#26725c]"/>Gastos personales y comunes</span>
            <span className="flex gap-2"><ShieldCheck size={18} className="text-[#26725c]"/>Privacidad por movimiento</span>
          </div>
        </div>
        <div className="relative mx-auto w-full max-w-md">
          <div className="card rotate-2 p-6 md:p-8">
            <p className="text-sm font-bold text-[#6c7f7a]">Agosto · En casa</p>
            <p className="mt-2 text-4xl font-black">1.284,30 €</p><p className="text-sm text-[#6c7f7a]">disponibles este mes</p>
            <div className="my-7 h-32 rounded-2xl bg-[linear-gradient(135deg,#dceee6,#f2c9bb)] p-5">
              <div className="flex h-full items-end gap-2">{[45,70,38,88,60,100,76].map((h,i)=><span key={i} className="flex-1 rounded-t bg-[#26725c]/80" style={{height:`${h}%`}}/>)}</div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm"><span className="grid size-10 place-items-center rounded-xl bg-[#e6f3ee]"><MessageCircle size={20}/></span><div><b className="text-sm">“42 € en supermercado”</b><p className="text-xs text-[#6c7f7a]">Listo, gasto compartido guardado</p></div></div>
          </div>
        </div>
      </section>
    </main>
  );
}
