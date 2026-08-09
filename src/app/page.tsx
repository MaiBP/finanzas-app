"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Bot,
  Check,
  HeartHandshake,
  MessageCircle,
  ScanLine,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { LinkButton } from "@/components/ui/button";

const steps = [
  {
    number: "01",
    icon: MessageCircle,
    tone: "bg-(--blue)",
    title: "Le escribís al bot",
    description: "Por Telegram, como a cualquier chat: “42€ en el súper” o mandás la foto del ticket.",
  },
  {
    number: "02",
    icon: Sparkles,
    tone: "bg-(--lilac)",
    title: "La IA lo entiende y lo guarda",
    description: "Detecta importe, categoría y si es un gasto compartido o personal. Sin formularios.",
  },
  {
    number: "03",
    icon: UsersRound,
    tone: "bg-(--lime)",
    title: "Lo ven juntos, al minuto",
    description: "El resumen del hogar se actualiza solo. Cualquiera de los dos puede preguntarle al asistente.",
  },
] as const;

const features = [
  {
    icon: MessageCircle,
    tone: "bg-(--blue)",
    title: "Carga por Telegram",
    description: "Registrá gastos e ingresos hablando con el bot, incluso mandando fotos de tickets o extractos.",
  },
  {
    icon: Bot,
    tone: "bg-(--lilac)",
    title: "Asistente con IA",
    description: "Preguntale cuánto gastaron juntos este mes, o cuánto gastaste vos en particular.",
  },
  {
    icon: UsersRound,
    tone: "bg-(--lime)",
    title: "Compartido y personal",
    description: "Cada movimiento decide si es del hogar o solo tuyo. Tu espacio privado sigue siendo privado.",
  },
  {
    icon: ScanLine,
    tone: "bg-(--pink)",
    title: "Balance sin cálculos",
    description: "Mirá de un vistazo quién puso qué este mes, sin abrir una sola hoja de cálculo.",
  },
] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

export default function HomePage() {
  return (
    <main className="relative overflow-hidden bg-(--canvas) text-(--ink)">
      <motion.div
        aria-hidden
        className="absolute -right-20 top-28 size-72 rounded-full bg-(--highlight) md:size-96"
        animate={{ y: [0, -18, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />

      <nav className="relative z-10 mx-auto flex max-w-6xl items-center justify-between border-b border-(--ink)/40 px-5 py-6 uppercase">
        <Link href="/" className="flex items-center gap-2 text-lg font-black">
          <span className="grid size-10 place-items-center rounded-full bg-(--highlight) text-xl">½</span>
          Miti-Miti
        </Link>
        <LinkButton href="/login" variant="outline" size="sm">
          Entrar
        </LinkButton>
      </nav>

      <section className="relative z-1 mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 md:grid-cols-2 md:py-24">
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.08 } } }}
        >
          <motion.p
            variants={fadeUp}
            className="mb-5 inline-flex items-center gap-2 rounded-full bg-(--highlight) px-4 py-2 text-sm font-bold uppercase"
          >
            <HeartHandshake size={16} /> El dinero, más fácil entre dos
          </motion.p>
          <motion.h1 variants={fadeUp} className="max-w-xl text-6xl md:text-8xl">
            Vuestras cuentas, claras y sin dramas.
          </motion.h1>
          <motion.p variants={fadeUp} className="mt-6 max-w-lg text-lg leading-8">
            Miti-Miti organiza gastos, separa lo personal de lo compartido y os ayuda a entender el mes de un
            vistazo. Todo desde un chat de Telegram, sin hojas imposibles.
          </motion.p>
          <motion.div variants={fadeUp} className="mt-8 flex flex-wrap gap-3">
            <LinkButton href="/registro" variant="primary">
              Crear vuestro hogar <ArrowRight size={18} />
            </LinkButton>
            <LinkButton href="/login" variant="inverse">
              Ya tengo cuenta
            </LinkButton>
          </motion.div>
          <motion.div variants={fadeUp} className="mt-10 flex flex-wrap gap-5 text-sm font-semibold">
            <span className="flex items-center gap-2">
              <Check size={18} /> Gastos personales y comunes
            </span>
            <span className="flex items-center gap-2">
              <ShieldCheck size={18} /> Privacidad por movimiento
            </span>
          </motion.div>
        </motion.div>

        <motion.div
          className="relative mx-auto w-full max-w-md"
          initial={{ opacity: 0, y: 24, rotate: 0 }}
          animate={{ opacity: 1, y: 0, rotate: 2 }}
          transition={{ duration: 0.6, delay: 0.15 }}
        >
          <div className="card relative p-6 md:p-8">
            <p className="text-sm font-bold uppercase text-(--muted)">Agosto · En casa</p>
            <p className="mt-2 text-4xl font-black">1.284,30 €</p>
            <p className="text-sm text-(--muted)">disponibles este mes</p>
            <div className="my-7 h-32 rounded-sm bg-(--highlight) p-5">
              <div className="flex h-full items-end gap-2">
                {[45, 70, 38, 88, 60, 100, 76].map((height, index) => (
                  <motion.span
                    key={index}
                    className="flex-1 bg-(--ink)"
                    initial={{ height: 0 }}
                    animate={{ height: `${height}%` }}
                    transition={{ duration: 0.5, delay: 0.4 + index * 0.05 }}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-sm border border-(--ink)/20 bg-(--pink) p-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white">
                <MessageCircle size={20} />
              </span>
              <div>
                <b className="text-sm">“42 € en supermercado”</b>
                <p className="text-xs text-(--ink)/70">Listo, gasto compartido guardado</p>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      <section className="relative z-1 border-t border-(--ink)/15 bg-(--paper) px-5 py-16 md:py-20">
        <div className="mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
          >
            <p className="w-fit rounded-full bg-(--highlight) px-4 py-1.5 text-sm font-bold uppercase">
              Cómo funciona
            </p>
            <h2 className="mt-4 text-4xl font-black tracking-tight md:text-5xl">De un mensaje a un resumen claro</h2>
          </motion.div>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {steps.map((step, index) => (
              <motion.article
                key={step.number}
                className="card overflow-hidden"
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.45, delay: index * 0.1 }}
              >
                <div className={`flex items-center justify-between p-6 ${step.tone}`}>
                  <span className="grid size-12 place-items-center rounded-full bg-white">
                    <step.icon size={22} />
                  </span>
                  <span className="text-5xl font-black text-(--ink)/20">{step.number}</span>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-black">{step.title}</h3>
                  <p className="mt-2 text-sm text-(--ink)/75">{step.description}</p>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-1 border-t border-(--ink)/15 px-5 py-16 md:py-20">
        <div className="mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
          >
            <p className="w-fit rounded-full bg-(--paper) px-4 py-1.5 text-sm font-bold uppercase">
              Todo lo que necesitan
            </p>
            <h2 className="mt-4 text-4xl font-black tracking-tight md:text-5xl">Pensada para dos, no para una hoja de cálculo</h2>
          </motion.div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            {features.map((feature, index) => (
              <motion.article
                key={feature.title}
                className={`rounded-sm border border-(--ink)/20 p-6 ${feature.tone}`}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.45, delay: index * 0.08 }}
              >
                <span className="grid size-11 place-items-center rounded-full bg-white">
                  <feature.icon size={20} />
                </span>
                <h3 className="mt-4 text-lg font-black">{feature.title}</h3>
                <p className="mt-1 text-sm text-(--ink)/75">{feature.description}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-1 border-t border-(--ink)/15 bg-(--ink) px-5 py-16 text-(--highlight) md:py-20">
        <motion.div
          className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-4xl font-black tracking-tight md:text-5xl">¿Organizamos las cuentas de una vez?</h2>
          <p className="max-w-lg text-(--highlight)/80">
            Crear el hogar toma menos de un minuto. Después, todo pasa por el chat.
          </p>
          <LinkButton href="/registro" variant="primary">
            Crear vuestro hogar <ArrowRight size={18} />
          </LinkButton>
        </motion.div>
      </section>

      <footer className="relative z-1 border-t border-(--ink)/15 bg-(--canvas) px-5 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-sm font-semibold uppercase sm:flex-row">
          <div className="flex items-center gap-2 text-base font-black">
            <span className="grid size-8 place-items-center rounded-full bg-(--highlight)">½</span>
            Miti-Miti
          </div>
          <p className="text-(--ink)/70">El dinero, más fácil entre dos.</p>
          <div className="flex gap-5">
            <Link href="/login" className="hover:underline">
              Entrar
            </Link>
            <Link href="/registro" className="hover:underline">
              Crear hogar
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
