"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Bot,
  Check,
  Facebook,
  HeartHandshake,
  Instagram,
  ShieldCheck,
} from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { landingFaq } from "@/content/landing-faq";
import { ScrollBackground } from "@/components/landing/scroll-background";
import { landingBody, landingDisplay } from "@/components/landing/fonts";

const displayFont = "font-(family-name:--font-landing-display)";

const steps = [
  {
    number: "01",
    image: "/phone-chat.png",
    tone: "bg-(--blue)",
    title: "Le hablas a Finzy",
    description: "Por Telegram, como en cualquier chat: “42 € en el súper” o le mandas la foto del ticket.",
  },
  {
    number: "02",
    image: "/ai-star.png",
    tone: "bg-(--lilac)",
    title: "La IA lo entiende y lo guarda",
    description: "Detecta el importe, la categoría y si es un gasto compartido o personal. Sin formularios.",
  },
  {
    number: "03",
    image: "/couple-highfive.png",
    tone: "bg-(--lime)",
    title: "Lo ven juntos, al instante",
    description: "El resumen del hogar se actualiza solo. Cualquiera de los dos puede preguntarle a Finzy.",
  },
] as const;

const features = [
  {
    image: "/phone-chat.png",
    tone: "bg-(--blue)",
    title: "Registro por Telegram",
    description: "Registra gastos e ingresos hablando con Finzy, incluso mandando fotos de tickets o extractos.",
  },
  {
    image: "/finzy-mascot.png",
    tone: "bg-(--lilac)",
    title: "Finzy, tu asistente con IA",
    description: "Pregúntale cuánto gastaron juntos este mes, o cuánto gastó cada uno por separado.",
  },
  {
    image: "/heart-hands.png",
    tone: "bg-(--lime)",
    title: "Gastos compartidos y personales",
    description: "Cada movimiento decide si es del hogar o solo tuyo. Tu espacio privado sigue siendo privado.",
  },
  {
    image: "/financial-report.png",
    tone: "bg-(--pink)",
    title: "Balance sin cálculos",
    description: "Mira de un vistazo quién puso qué este mes, sin abrir una sola hoja de cálculo.",
  },
] as const;

const queries = [
  { question: "¿Cuánto gastamos este mes?", answer: "Llevan 1.240 € de gasto, 180 € menos que el mes pasado." },
  { question: "¿En qué gastamos más?", answer: "El mayor gasto fue Supermercado, con 320 € este mes." },
  { question: "¿Cuánto ahorramos respecto al mes pasado?", answer: "Ahorraron 95 € más que el mes anterior." },
] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

const fadeInView = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
} as const;

export function LandingPage() {
  return (
    <main
      className={`relative overflow-hidden text-(--ink) font-(family-name:--font-landing-body) ${landingBody.variable} ${landingDisplay.variable}`}
    >
      <ScrollBackground />
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
            <HeartHandshake size={16} /> Finanzas en pareja, sin complicaciones
          </motion.p>
          <motion.h1 variants={fadeUp} className={`max-w-xl text-5xl font-extrabold md:text-7xl ${displayFont}`}>
            <span className="bg-(--highlight) px-1">Finanzas</span> en pareja, tan <span className="bg-(--highlight) px-1">fácil</span> como enviar un mensaje
          </motion.h1>
          <motion.p variants={fadeUp} className="mt-6 max-w-lg text-lg leading-8">
            Registra gastos e ingresos hablando con Finzy y entiende fácilmente en qué gastan,
            cuánto ahorran y cómo evoluciona su economía. Todo desde un chat de Telegram, sin hojas de cálculo.
          </motion.p>
          <motion.div variants={fadeUp} className="mt-8 flex flex-wrap gap-3">
            <LinkButton href="/registro" variant="primary">
              Crear tu hogar <ArrowRight size={18} />
            </LinkButton>
            <LinkButton href="/login" variant="inverse">
              Ya tengo cuenta
            </LinkButton>
          </motion.div>
          <motion.div variants={fadeUp} className="mt-10 flex flex-wrap gap-5 text-sm font-semibold">
            <span className="flex items-center gap-2">
              <Check size={18} /> Gastos personales y compartidos
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
          <Image
            src="/finance-summary-card.png"
            alt="Resumen de agosto en casa: 1.284,30 € disponibles este mes, gráfico de gastos y el último movimiento, «42 € en supermercado», guardado como gasto compartido"
            width={1536}
            height={1024}
            className="h-auto w-full"
            priority
          />
        </motion.div>
      </section>

      <section className="relative z-1 border-t border-(--ink)/15 bg-(--ink) px-5 py-16 text-(--highlight) md:py-20">
        <motion.div className="mx-auto max-w-4xl text-center" {...fadeInView} transition={{ duration: 0.5 }}>
          <h2 className={`text-2xl font-extrabold tracking-tight text-white md:whitespace-nowrap md:text-3xl ${displayFont}`}>
            🤝 Una forma <span className="bg-(--highlight) px-1 text-(--ink)">más fácil de gestionar</span> las finanzas en pareja
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-(--highlight)/85">
            Son dos personas con ingresos, gastos y costumbres distintas: una cuenta en común, gastos personales
            aparte, y alguien que paga el súper mientras el otro paga el alquiler. Anotar todo a mano en una hoja de
            cálculo es tedioso, y es fácil perder de vista en qué se fue el dinero del mes.
          </p>
          <p className="mx-auto mt-4 max-w-2xl font-bold text-(--highlight)">
            ✨ Miti-Miti lo ordena todo, sin que ninguno de los dos tenga que llevar las cuentas solo.
          </p>
        </motion.div>
      </section>

      <section className="relative z-1 border-t border-(--ink)/15 px-5 py-16 md:py-20">
        <div className="mx-auto max-w-6xl">
          <motion.div {...fadeInView} transition={{ duration: 0.5 }}>
            <p className="w-fit rounded-full bg-(--highlight) px-4 py-1.5 text-sm font-bold uppercase">
              Registra hablando
            </p>
            <h2 className={`mt-4 text-4xl font-extrabold tracking-tight md:text-5xl ${displayFont}`}>
              De un mensaje a un <span className="bg-(--highlight) px-1">resumen claro</span>
            </h2>
          </motion.div>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {steps.map((step, index) => (
              <motion.article
                key={step.number}
                className="card relative"
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.45, delay: index * 0.1 }}
              >
                <Image
                  src={step.image}
                  alt=""
                  width={112}
                  height={112}
                  className="absolute -top-7 -left-6 z-10 size-24 rotate-[-8deg] object-contain drop-shadow-[4px_4px_0_rgba(58,52,52,0.18)]"
                />
                <div className={`flex justify-end rounded-t-[0.35rem] p-6 ${step.tone}`}>
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
        <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-2 md:items-center">
          <motion.div {...fadeInView} transition={{ duration: 0.5 }}>
            <p className="w-fit rounded-full bg-(--paper) px-4 py-1.5 text-sm font-bold uppercase">
              Compartido y personal
            </p>
            <h2 className={`mt-4 text-4xl font-extrabold tracking-tight md:text-5xl ${displayFont}`}>
              Lo tuyo. Lo suyo. Lo de <span className="bg-(--highlight) px-1">los dos</span>.
            </h2>
            <p className="mt-4 max-w-lg text-(--ink)/75">
              Cada movimiento decide si es personal o compartido: los gastos propios quedan aparte, sin mezclarse con
              los del hogar, y ambas personas ven el resumen conjunto cuando lo necesitan.
            </p>
          </motion.div>
          <motion.div
            className="grid gap-4 sm:grid-cols-2"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="rounded-sm border border-(--ink)/20 bg-(--lime) p-5">
              <p className="w-fit bg-(--highlight) px-1 text-xs font-black uppercase">Espacio compartido</p>
              <p className="mt-3 text-2xl font-black">Hogar</p>
              <p className="mt-1 text-sm text-(--ink)/75">Alquiler, súper, servicios: todo lo que pagan entre los dos.</p>
            </div>
            <div className="rounded-sm border border-(--ink)/20 bg-(--blue) p-5">
              <p className="w-fit bg-(--highlight) px-1 text-xs font-black uppercase">Espacio personal</p>
              <p className="mt-3 text-2xl font-black">Solo tuyo</p>
              <p className="mt-1 text-sm text-(--ink)/75">Tus gastos privados, visibles únicamente para ti.</p>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="relative z-1 border-t border-(--ink)/15 px-5 py-16 md:py-20">
        <div className="mx-auto max-w-6xl">
          <motion.div {...fadeInView} transition={{ duration: 0.5 }}>
            <p className="w-fit rounded-full bg-(--highlight) px-4 py-1.5 text-sm font-bold uppercase">
              Pregunta cuando quieras
            </p>
            <h2 className={`mt-4 text-4xl font-extrabold tracking-tight md:text-5xl ${displayFont}`}>
              Pregúntale a <span className="bg-(--highlight) px-1">Finzy</span> sobre tu dinero
            </h2>
            <p className="mt-4 max-w-lg text-(--ink)/75">
              Nada de exportar planillas: pregunta en lenguaje natural y recibe la respuesta al instante.
            </p>
          </motion.div>
          <motion.div
            className="card mx-auto mt-10 max-w-xl space-y-3 p-6"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            {queries.map((item) => (
              <div key={item.question} className="space-y-2">
                <div className="ml-auto w-fit max-w-[85%] rounded-2xl bg-(--highlight) px-4 py-2 text-sm font-bold">
                  {item.question}
                </div>
                <div className="flex w-fit max-w-[85%] items-start gap-2 rounded-2xl bg-(--blue) px-4 py-2 text-sm">
                  <Bot size={16} className="mt-0.5 shrink-0" />
                  {item.answer}
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="relative z-1 border-t border-(--ink)/15 bg-(--paper) px-5 py-16 md:py-20">
        <div className="mx-auto max-w-6xl">
          <motion.div {...fadeInView} transition={{ duration: 0.5 }}>
            <p className="w-fit rounded-full bg-(--highlight) px-4 py-1.5 text-sm font-bold uppercase">
              Todo lo que necesitan
            </p>
            <h2 className={`mt-4 text-4xl font-extrabold tracking-tight md:text-5xl ${displayFont}`}>
              Todo lo que necesitan para <span className="bg-(--highlight) px-1">organizar su dinero</span>
            </h2>
          </motion.div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            {features.map((feature, index) => (
              <motion.article
                key={feature.title}
                className={`relative rounded-sm border border-(--ink)/20 p-6 ${feature.tone}`}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.45, delay: index * 0.08 }}
              >
                <Image
                  src={feature.image}
                  alt=""
                  width={100}
                  height={100}
                  className="absolute -top-6 -right-5 z-10 size-20 rotate-6 object-contain drop-shadow-[3px_3px_0_rgba(58,52,52,0.18)]"
                />
                <h3 className="max-w-[70%] text-lg font-black">{feature.title}</h3>
                <p className="mt-1 max-w-[88%] text-sm text-(--ink)/75">{feature.description}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-1 border-t border-(--ink)/15 px-5 py-16 md:py-20">
        <div className="mx-auto max-w-3xl">
          <motion.div {...fadeInView} transition={{ duration: 0.5 }}>
            <p className="w-fit rounded-full bg-(--highlight) px-4 py-1.5 text-sm font-bold uppercase">
              Preguntas frecuentes
            </p>
            <h2 className={`mt-4 text-4xl font-extrabold tracking-tight md:text-5xl ${displayFont}`}>
              Dudas comunes sobre finanzas en pareja
            </h2>
          </motion.div>
          <motion.div
            className="mt-10 divide-y divide-(--ink)/10 rounded-sm border border-(--ink)/20 bg-white"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            {landingFaq.map((item) => (
              <details key={item.question} className="group p-5">
                <summary className="cursor-pointer list-none font-bold marker:content-none">
                  <span className="flex items-center justify-between gap-3">
                    {item.question}
                    <span className="shrink-0 text-(--ink)/50 group-open:rotate-45">+</span>
                  </span>
                </summary>
                <p className="mt-2 text-sm text-(--ink)/75">{item.answer}</p>
              </details>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="relative z-1 border-t border-(--ink)/15 px-5 py-16 md:py-20">
        <motion.div
          className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center"
          {...fadeInView}
          transition={{ duration: 0.5 }}
        >
          <h2 className={`text-4xl font-extrabold tracking-tight md:text-5xl ${displayFont}`}>¿Organizamos las cuentas de una vez?</h2>
          <p className="max-w-lg text-(--ink)/75">
            Crear el hogar toma menos de un minuto. Después, todo pasa por el chat.
          </p>
          <LinkButton href="/registro" variant="primary">
            Crear tu hogar <ArrowRight size={18} />
          </LinkButton>
        </motion.div>
      </section>

      <footer className="relative z-1 border-t border-(--ink)/15 px-5 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-sm font-semibold uppercase sm:flex-row">
          <div className="flex items-center gap-2 text-base font-black">
            <span className="grid size-8 place-items-center rounded-full bg-(--highlight)">½</span>
            Miti-Miti
          </div>
          <p className="text-(--ink)/70">Finanzas en pareja, sin complicaciones.</p>
          <div className="flex items-center gap-5">
            <Link href="/login" className="hover:underline">
              Entrar
            </Link>
            <Link href="/registro" className="hover:underline">
              Crear hogar
            </Link>
            <span className="flex items-center gap-3 border-l border-(--ink)/20 pl-5 normal-case">
              <span className="flex items-center gap-2 text-(--ink)/50" title="Muy pronto en redes sociales">
                <Instagram size={18} />
                <Facebook size={18} />
              </span>
              <span className="text-[11px] font-bold normal-case text-(--ink)/50">Muy pronto en redes</span>
            </span>
          </div>
        </div>
      </footer>
    </main>
  );
}
