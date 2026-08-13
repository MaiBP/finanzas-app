import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Términos y privacidad",
  robots: { index: false, follow: false },
};

export default function TerminosPage() {
  return (
    <main className="mx-auto min-h-screen max-w-2xl px-5 py-12">
      <Link href="/onboarding" className="mb-8 flex items-center gap-2 text-sm font-bold">
        <ArrowLeft size={17} /> Volver
      </Link>
      <p className="w-fit bg-(--highlight) px-2 text-xs font-black uppercase tracking-wider">Miti-Miti</p>
      <h1 className="mt-4 text-3xl font-black tracking-tight md:text-4xl">Términos y Política de Privacidad</h1>
      <p className="mt-2 text-sm text-(--muted)">Última actualización: agosto de 2026.</p>

      <div className="card mt-8 space-y-6 p-6 text-sm leading-relaxed text-(--ink)/85 md:p-8">
        <section>
          <h2 className="text-lg font-black text-(--ink)">1. Qué información guardamos</h2>
          <p className="mt-2">
            Guardamos lo necesario para que la app funcione: tu nombre, tus movimientos (gastos e ingresos), tus
            cuentas y, si vinculás el asistente de Telegram, el historial de esa conversación. Nunca vendemos ni
            compartimos esta información con terceros, y no la usamos para publicidad ni para fines distintos de
            operar Miti-Miti.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-black text-(--ink)">2. Cifrado</h2>
          <p className="mt-2">
            Tu nombre, las descripciones de tus movimientos y el historial de conversación con el asistente se
            guardan cifrados en nuestra base de datos (AES-256). Esto significa que, incluso con acceso directo a la
            base, ese contenido no se puede leer en texto plano.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-black text-(--ink)">3. Qué recibe la inteligencia artificial</h2>
          <p className="mt-2">
            El asistente financiero funciona con un modelo de IA de terceros para redactar respuestas e interpretar
            tus mensajes. Nunca le enviamos tu nombre real ni el de tu pareja — solo importes, categorías y fechas.
            Si mencionás un nombre propio en un mensaje, lo reemplazamos por &ldquo;tú&rdquo; o &ldquo;tu pareja&rdquo; antes de que
            llegue al modelo.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-black text-(--ink)">4. Tu espacio personal</h2>
          <p className="mt-2">
            Cada persona tiene un espacio privado para sus cuentas y movimientos personales. Tu pareja no puede verlo
            bajo ninguna circunstancia, ni desde la web ni desde el asistente.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-black text-(--ink)">5. Tus derechos sobre tus datos</h2>
          <p className="mt-2">
            Podés pedirnos en cualquier momento que eliminemos tu cuenta y toda tu información escribiéndonos. Vamos a
            responder ese pedido a la brevedad.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-black text-(--ink)">6. Cambios a este texto</h2>
          <p className="mt-2">
            Si actualizamos estos términos de forma relevante, te lo vamos a hacer saber dentro de la app.
          </p>
        </section>
      </div>
    </main>
  );
}
