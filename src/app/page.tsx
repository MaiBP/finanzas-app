import Link from "next/link";
import { ArrowRight, Check, HeartHandshake, MessageCircle, ShieldCheck } from "lucide-react";

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#ff9655] text-[#3a3434]">
      <div aria-hidden className="absolute -right-20 top-28 size-72 rounded-full bg-[#ffff50] md:size-96" />
      <nav className="relative z-10 mx-auto flex max-w-6xl items-center justify-between border-b border-[#3a3434]/40 px-5 py-6 uppercase">
        <div className="flex items-center gap-2 text-lg font-black"><span className="grid size-10 place-items-center rounded-full bg-[#ffff50]">a</span>A medias</div>
        <Link href="/login" className="rounded-full border border-[#3a3434] px-5 py-2.5 text-sm font-bold hover:bg-[#3a3434] hover:text-[#ffff50]">Entrar</Link>
      </nav>
      <section className="relative z-[1] mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 md:grid-cols-2 md:py-24">
        <div>
          <p className="mb-5 inline-flex items-center gap-2 rounded-full bg-[#ffff50] px-4 py-2 text-sm font-bold uppercase"><HeartHandshake size={16}/> El dinero, más fácil entre dos</p>
          <h1 className="max-w-xl text-6xl md:text-8xl">Vuestras cuentas, claras y sin dramas.</h1>
          <p className="mt-6 max-w-lg text-lg leading-8">Registrad gastos, repartid lo compartido y entended vuestro mes de un vistazo. Sin hojas imposibles.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/registro" className="flex items-center gap-2 rounded-full bg-[#3a3434] px-6 py-3.5 font-bold text-[#ffff50] hover:-translate-y-1">Crear vuestro hogar <ArrowRight size={18}/></Link>
            <Link href="/login" data-button-theme="inverse" className="rounded-full px-6 py-3.5 font-bold">Ya tengo cuenta</Link>
          </div>
          <div className="mt-10 flex flex-wrap gap-5 text-sm font-semibold">
            <span className="flex gap-2"><Check size={18}/>Gastos personales y comunes</span>
            <span className="flex gap-2"><ShieldCheck size={18}/>Privacidad por movimiento</span>
          </div>
        </div>
        <div className="relative mx-auto w-full max-w-md">
          <div className="card relative rotate-2 p-6 md:p-8">
            <p className="text-sm font-bold uppercase text-[#6e6464]">Agosto · En casa</p>
            <p className="mt-2 text-4xl font-black">1.284,30 €</p><p className="text-sm text-[#6e6464]">disponibles este mes</p>
            <div className="my-7 h-32 rounded-sm bg-[#ffff50] p-5">
              <div className="flex h-full items-end gap-2">{[45,70,38,88,60,100,76].map((height,index)=><span key={index} className="flex-1 bg-[#3a3434]" style={{height:`${height}%`}}/>)}</div>
            </div>
            <div className="flex items-center gap-3 rounded-sm border border-[#3a3434]/20 bg-[#ff96be] p-3"><span className="grid size-10 place-items-center rounded-full bg-white"><MessageCircle size={20}/></span><div><b className="text-sm">“42 € en supermercado”</b><p className="text-xs text-[#3a3434]/70">Listo, gasto compartido guardado</p></div></div>
          </div>
        </div>
      </section>
    </main>
  );
}
