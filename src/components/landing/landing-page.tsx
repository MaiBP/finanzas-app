"use client";

import { useState, type CSSProperties } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  Facebook,
  Home,
  Instagram,
  Lock,
  MessageCircle,
  PiggyBank,
  ShieldCheck,
  Sparkles,
  Users2,
} from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { landingFaq } from "@/content/landing-faq";
import { landingBody, landingDisplay, landingSubhead } from "@/components/landing/fonts";
import { HeroScrubVideo } from "@/components/landing/hero-scrub-video";
import { HeroTitle } from "@/components/landing/hero-title";
import { FloatingTransactions } from "@/components/landing/floating-transactions";
import { NotificationCard } from "@/components/landing/notification-card";

const subheadFont = "font-(family-name:--font-landing-subhead)";

// Follows DESIGN.md's "Busy Bee Honey" brief: flat full-bleed color sections (no shadows, no
// elevation), pill-only shape language (tags/badges/buttons all 500-1000px radius, cards square).
// The hero (HeroTitle's typewriter, FloatingTransactions, the scrub video) and NotificationCard
// are deliberately left untouched: both were tuned extensively in earlier passes and "don't
// modify the notification style" is a standing instruction. --highlight (Honeycomb Gold) still
// drives the shared Button's "primary" variant, so no changes were needed there either.
const theme = {
  "--ink": "#3b2722", // Dark Cocoa
  "--paper": "#f2ebd0", // Cream Parchment
  "--highlight": "#ffca50", // Honeycomb Gold
  "--muted": "#3b272799", // Dark Cocoa, translucent
} as CSSProperties;

const COCOA = "#3b2722";
const CREAM = "#f2ebd0";
const GOLD = "#ffca50";
const GOLD_WASH = "#ffe9b3"; // diluted gold — wash-card surface on Cream sections
const BARN_RED = "#a0342a";
const BLUE = "#6aacc2"; // Cornflower — icon medallions
const PINK = "#ff96be"; // accent detail only (tags, Piggy name), never a full-bleed section canvas

const pricingBenefits = [
  "Sin tarjeta para empezar",
  "Acceso completo, sin funciones recortadas",
  "Hasta 2 personas por hogar",
  "Cancelás cuando quieras, sin permanencia",
] as const;

const steps = [
  { icon: MessageCircle, title: "Le hablas a Piggy", description: "Por Telegram, como en cualquier chat: “42 € en el súper” o le mandas la foto del ticket." },
  { icon: Sparkles, title: "La IA lo entiende y lo guarda", description: "Detecta el importe, la categoría y si es un gasto compartido o personal. Sin formularios." },
  { icon: Users2, title: "Lo ven juntos, al instante", description: "El resumen del hogar se actualiza solo. Cualquiera de los dos puede preguntarle a Piggy." },
] as const;

const features = [
  { icon: MessageCircle, title: "Registro por Telegram", description: "Registra gastos e ingresos hablando con Piggy, incluso mandando fotos de tickets o extractos." },
  { icon: Sparkles, title: "Piggy, tu asistente con IA", description: "Pregúntale cuánto gastaron juntos este mes, o cuánto gastó cada uno por separado." },
  { icon: Users2, title: "Gastos compartidos y personales", description: "Cada movimiento decide si es del hogar o solo tuyo. Tu espacio privado sigue siendo privado." },
  { icon: ShieldCheck, title: "Balance sin cálculos", description: "Mira de un vistazo quién puso qué este mes, sin abrir una sola hoja de cálculo." },
] as const;

const exchanges = [
  { q: "¿Cuánto gastamos este mes?", a: "Llevan 1.240 € de gasto, 180 € menos que el mes pasado." },
  { q: "¿En qué gastamos más?", a: "El mayor gasto fue Supermercado, con 320 € este mes." },
  { q: "¿Cuánto ahorramos respecto al mes pasado?", a: "Ahorraron 95 € más que el mes anterior." },
] as const;

const todaysMovements = [
  { name: "Alquiler", category: "Hogar" as const, amount: "−650 €" },
  { name: "Café con amigos", category: "Personal" as const, amount: "−4,50 €" },
  { name: "Supermercado", category: "Hogar" as const, amount: "−58 €" },
];

const fadeInView = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
} as const;

// "Circular Badge" role, borrowed for step/feature icon tiles — a Cornflower Blue medallion by
// default since honey has no dedicated icon-tile color of its own.
function CircleBadge({ children, tone = BLUE, on = COCOA }: { children: React.ReactNode; tone?: string; on?: string }) {
  return (
    <span className="grid size-14 shrink-0 place-items-center rounded-full" style={{ background: tone, color: on }}>
      {children}
    </span>
  );
}

// Pill-shaped tag (500px radius, per DESIGN.md's "tags" token) rather than bare uppercase text —
// "pills are the only shape language" the brief calls for.
function Eyebrow({ children, tone }: { children: React.ReactNode; tone: string }) {
  return (
    <span className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold tracking-[0.14em] uppercase" style={{ borderColor: tone, color: tone }}>
      {children}
    </span>
  );
}

// "Piggy" (the assistant, personified as the piggy bank) with its icon — used wherever the name
// stands alone as a label rather than inside a flowing sentence.
function PiggyName({ tone }: { tone: string }) {
  return (
    <span className="inline-flex items-center gap-1.5" style={{ color: tone }}>
      <PiggyBank size={16} /> Piggy
    </span>
  );
}

export function LandingPage() {
  // Two-stage hero reveal: (1) the title types out, (2) once done, the floating "movimientos"
  // and the claim/secondary line/CTAs all reveal together.
  const [titleDone, setTitleDone] = useState(false);

  return (
    <main
      style={{ ...theme, background: COCOA }}
      className={`text-(--ink) ${landingBody.variable} ${landingDisplay.variable} ${landingSubhead.variable} font-(family-name:--font-landing-body)`}
    >
      <div className="relative z-10">
        <nav className="absolute inset-x-0 top-0 z-20 flex items-center px-5 py-6 sm:px-10">
          <Link href="/" className="flex items-center">
            <Image src="/logo-mitimiti.png" alt="Miti-Miti" width={44} height={44} className="size-10 object-contain" />
          </Link>
        </nav>

        {/* HERO — Piggy is the protagonist: the center column stays empty so the character
            can breathe, title lives on the left, secondary line + CTAs are fixed on the right
            (neither tracks the cursor), and a rotating pool of decorative "movimientos" floats in
            safe slots around Piggy. The video itself — file, crop, mouse-scrub mechanics — is
            unchanged; only the overlay layout around it changed. A single flat (non-gradient)
            scrim keeps text legible without competing with the character. */}
        <section className="relative flex h-dvh min-h-160 w-full items-center justify-center overflow-hidden" style={{ background: COCOA }}>
          <HeroScrubVideo
            src="/Piggy_bank_head_animation_1.mp4"
            className="absolute inset-0 h-full w-full"
            objectPositionClassName="object-[center_25%] md:object-[70%_center]"
          >
            <div className="pointer-events-none absolute inset-0" style={{ background: COCOA, opacity: 0.32 }} />

            <FloatingTransactions start={titleDone} />

            {/* pointer-events-none here: these columns are full-height flex items so their
                (invisible, backgroundless) boxes would otherwise sit above and swallow clicks on
                the floating badges behind them. Only the actual interactive content (the CTA
                buttons below) opts back into pointer-events-auto. */}
            {/* xl: (1280px), not lg: (1024px) — the 3-column row layout needs more width than the
                lg tier has to spare for the title to stay on 4 lines without crowding Piggy, so
                the stacked layout (which already has plenty of room) covers the 1024–1279px gap
                too. */}
            <div className="pointer-events-none relative z-10 flex h-full w-full flex-col xl:flex-row">
              {/* LEFT — animated title, typewriter entrance with a trailing blink cursor. */}
              <div className="flex flex-none flex-col justify-center px-5 pt-18 sm:px-10 xl:max-w-140 xl:flex-1 xl:pt-0">
                <HeroTitle color={CREAM} onComplete={() => setTitleDone(true)} />
              </div>

              {/* CENTER — intentionally empty: reserves clean space for Piggy/the video. */}
              <div className="h-[18vh] xl:h-auto xl:flex-1" aria-hidden="true" />

              {/* RIGHT — claim, secondary line, and CTAs grouped together (fixed in place, never
                  tracks the cursor), all revealed together as soon as the title is done. */}
              <div className="flex flex-none flex-col items-start gap-4 px-5 pb-10 sm:px-10 xl:max-w-120 xl:flex-1 xl:justify-center xl:pb-0">
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={titleDone ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
                  transition={{ duration: 0.5 }}
                  className="pointer-events-auto flex flex-col items-start gap-3"
                >
                  <p className="text-xs font-semibold tracking-widest whitespace-nowrap uppercase sm:text-sm" style={{ color: GOLD }}>
                    Finanzas en pareja, sin complicaciones
                  </p>
                  <p className="text-lg whitespace-nowrap sm:text-2xl" style={{ color: `${CREAM}cc` }}>
                    Le hablás a Piggy y él ordena todo.
                  </p>
                  <div className="mt-1 flex flex-wrap gap-3 sm:flex-nowrap">
                    <LinkButton href="/registro" variant="primary" className="shrink-0 uppercase tracking-[0.02em]">
                      Crear tu hogar <ArrowRight size={18} />
                    </LinkButton>
                    <LinkButton href="/login" variant="outline" className="shrink-0 border-(--paper) text-(--paper) uppercase tracking-[0.02em] hover:text-(--highlight)">
                      Ya tengo cuenta
                    </LinkButton>
                  </div>
                </motion.div>
              </div>
            </div>
          </HeroScrubVideo>
        </section>

        {/* STATEMENT — Cream stage, left-aligned inside a centered column: full-bleed color, no
            gutter on the section itself, DESIGN.md-scale headline (heading-lg/65px role, tightened
            tracking). */}
        <section className="px-5 py-10 sm:px-10 md:py-16" style={{ background: CREAM }}>
          <motion.div className="mx-auto max-w-5xl" {...fadeInView} transition={{ duration: 0.5 }}>
            <Eyebrow tone={BARN_RED}>Por qué Miti-Miti</Eyebrow>
            <h2 className={`mt-3 max-w-3xl text-4xl leading-[1.0] tracking-[-0.02em] sm:text-6xl md:text-7xl ${subheadFont}`} style={{ color: COCOA }}>
              Una forma más fácil de gestionar las finanzas en pareja
            </h2>
            <p className="mt-6 max-w-2xl text-lg" style={{ color: `${COCOA}cc` }}>
              Son dos personas con ingresos, gastos y costumbres distintas: una cuenta en común, gastos personales aparte, y alguien que paga el súper mientras el otro paga el alquiler. Miti-Miti lo ordena todo, sin que ninguno de los dos tenga que llevar las cuentas solo.
            </p>
          </motion.div>
        </section>

        {/* STEPS — Dark Cocoa stage, left-aligned eyebrow/heading, 3-column list. */}
        <section className="px-5 py-10 sm:px-10 md:py-16" style={{ background: COCOA }}>
          <div className="mx-auto max-w-5xl">
            <motion.div {...fadeInView} transition={{ duration: 0.5 }}>
              <Eyebrow tone={PINK}>Registra hablando</Eyebrow>
              <h2 className={`mt-3 text-4xl leading-[1.0] tracking-[-0.02em] sm:text-6xl md:text-7xl ${subheadFont}`} style={{ color: CREAM }}>
                De un mensaje a un resumen claro
              </h2>
            </motion.div>
            <div className="mt-10 grid gap-8 sm:grid-cols-3 sm:gap-6">
              {steps.map((step) => (
                <motion.div key={step.title} {...fadeInView} transition={{ duration: 0.45 }}>
                  <CircleBadge tone={PINK}><step.icon size={24} /></CircleBadge>
                  <h3 className={`mt-5 text-xl ${subheadFont}`} style={{ color: GOLD }}>{step.title}</h3>
                  <p className="mt-2" style={{ color: `${CREAM}cc` }}>{step.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* PERSONAL / SHARED — text left, illustration card right, filled with the diluted-gold
            wash to read as the hero of the section. Cards are square (0px radius, per DESIGN.md);
            NotificationCard itself is left exactly as tuned before. */}
        <section className="px-5 py-10 sm:px-10 md:py-16" style={{ background: CREAM }}>
          <div className="mx-auto grid max-w-5xl items-center gap-8 sm:grid-cols-2">
            <motion.div {...fadeInView} transition={{ duration: 0.5 }}>
              <Eyebrow tone={BARN_RED}>Compartido y personal</Eyebrow>
              <h2 className={`mt-3 text-4xl leading-[1.0] tracking-[-0.02em] sm:text-5xl md:text-6xl ${subheadFont}`} style={{ color: COCOA }}>
                Lo tuyo. Lo suyo. Lo de los dos.
              </h2>
              <div className="mt-6 space-y-4">
                <div className="flex items-start gap-3">
                  <CircleBadge tone={COCOA} on={GOLD}><Home size={20} /></CircleBadge>
                  <div>
                    <h3 className={`text-lg ${subheadFont}`} style={{ color: COCOA }}>Hogar</h3>
                    <p style={{ color: `${COCOA}cc` }}>Alquiler, súper, servicios: todo lo que pagan entre los dos.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CircleBadge tone={COCOA} on={GOLD}><Lock size={20} /></CircleBadge>
                  <div>
                    <h3 className={`text-lg ${subheadFont}`} style={{ color: COCOA }}>Solo tuyo</h3>
                    <p style={{ color: `${COCOA}cc` }}>Tus gastos privados, visibles únicamente para ti.</p>
                  </div>
                </div>
              </div>
              <div
                className="mt-6 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-semibold tracking-[0.08em] uppercase"
                style={{ background: COCOA, color: CREAM }}
              >
                <ShieldCheck size={16} /> Privacidad por movimiento, siempre
              </div>
            </motion.div>

            <motion.div
              className="p-5 sm:p-6"
              style={{ background: GOLD_WASH }}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.45, delay: 0.1 }}
            >
              <p className="text-xs font-semibold tracking-[0.14em] uppercase" style={{ color: BARN_RED }}>Movimientos de hoy</p>
              <div className="mt-4 space-y-3">
                {todaysMovements.map((row) => (
                  <NotificationCard
                    key={row.name}
                    icon={row.category === "Hogar" ? Home : Lock}
                    iconBg={row.category === "Hogar" ? COCOA : BLUE}
                    iconFg={row.category === "Hogar" ? GOLD : COCOA}
                    heading={row.category}
                    detail={`${row.name} · ${row.amount}`}
                  />
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* PIGGY AI — Dark Cocoa stage; the new pink is an accent detail here (tag + Piggy name),
            not the section canvas. */}
        <section className="px-5 py-10 sm:px-10 md:py-16" style={{ background: COCOA }}>
          <div className="mx-auto max-w-4xl">
            <motion.div {...fadeInView} transition={{ duration: 0.5 }}>
              <Eyebrow tone={PINK}>Pregunta cuando quieras</Eyebrow>
              <h2 className={`mt-3 text-4xl leading-[1.0] tracking-[-0.02em] sm:text-6xl md:text-7xl ${subheadFont}`} style={{ color: CREAM }}>
                Pregúntale a Piggy sobre tu dinero
              </h2>
              <p className="mt-4 max-w-2xl text-lg" style={{ color: `${CREAM}cc` }}>
                Nada de exportar planillas: pregunta en lenguaje natural y recibe la respuesta al instante.
              </p>
            </motion.div>
            <motion.div
              className="mt-8 divide-y"
              style={{ borderColor: `${CREAM}33` }}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              {exchanges.map((exchange) => (
                <div key={exchange.q} className="py-5" style={{ borderColor: `${CREAM}33` }}>
                  <p className={`text-xl ${subheadFont}`} style={{ color: CREAM }}>{exchange.q}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-1" style={{ color: `${CREAM}cc` }}>
                    <PiggyName tone={PINK} /> · {exchange.a}
                  </p>
                </div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* FEATURES — Honeycomb Gold stage (one of DESIGN.md's three sanctioned full-bleed
            canvases, previously unused as a section background here) instead of Cream, so it no
            longer sits back-to-back with Pricing's Cream. A single 4-up grid (echoing STEPS'
            icon+title+description pattern) replaces the old text-list-plus-duplicate-icon-grid,
            which repeated the same four items twice in one section. */}
        <section className="px-5 py-10 sm:px-10 md:py-16" style={{ background: GOLD }}>
          <div className="mx-auto max-w-5xl">
            <motion.div {...fadeInView} transition={{ duration: 0.5 }}>
              <Eyebrow tone={COCOA}>Todo lo que necesitan</Eyebrow>
              <h2 className={`mt-3 text-4xl leading-[1.0] tracking-[-0.02em] sm:text-5xl md:text-6xl ${subheadFont}`} style={{ color: COCOA }}>
                Todo para organizar su dinero
              </h2>
            </motion.div>
            <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((feature) => (
                <motion.div key={feature.title} {...fadeInView} transition={{ duration: 0.45 }}>
                  <CircleBadge tone={COCOA} on={GOLD}><feature.icon size={20} /></CircleBadge>
                  <h3 className={`mt-5 text-lg ${subheadFont}`} style={{ color: COCOA }}>{feature.title}</h3>
                  <p className="mt-2" style={{ color: `${COCOA}cc` }}>{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* PRICING — Cream stage, same two-column pattern (and Barn Red tag / Gold Wash card
            pairing) as PERSONAL/SHARED and FEATURES: a benefits checklist left, the price card
            right. */}
        <section className="px-5 py-10 sm:px-10 md:py-16" style={{ background: CREAM }}>
          <div className="mx-auto grid max-w-5xl items-center gap-8 sm:grid-cols-2">
            <motion.div {...fadeInView} transition={{ duration: 0.5 }}>
              <Eyebrow tone={BARN_RED}>Prueba gratis, sin trucos</Eyebrow>
              <h2 className={`mt-3 text-4xl leading-[1.0] tracking-[-0.02em] sm:text-5xl md:text-6xl ${subheadFont}`} style={{ color: COCOA }}>
                Probá Miti-Miti 30 días con todas las funciones
              </h2>
              <p className="mt-4 max-w-md text-lg" style={{ color: `${COCOA}cc` }}>
                La prueba arranca cuando empezás a usar la app: registrá tu primer movimiento y ya corren tus 30 días.
              </p>
              <ul className="mt-6 space-y-3">
                {pricingBenefits.map((benefit) => (
                  <li key={benefit} className="flex items-center gap-3">
                    <span className="grid size-6 shrink-0 place-items-center rounded-full" style={{ background: COCOA, color: GOLD }}>
                      <Check size={14} />
                    </span>
                    <span style={{ color: `${COCOA}cc` }}>{benefit}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div
              className="p-6 sm:p-8"
              style={{ background: GOLD_WASH }}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.45, delay: 0.1 }}
            >
              <p className="text-xs font-semibold tracking-[0.14em] uppercase" style={{ color: BARN_RED }}>Un solo plan</p>
              <p className={`mt-3 text-6xl ${subheadFont}`} style={{ color: COCOA }}>
                4,99 € <span className="text-lg font-normal" style={{ color: `${COCOA}99` }}>/ mes</span>
              </p>
              <p className="mt-2 text-sm" style={{ color: `${COCOA}99` }}>Recién después de tus 30 días gratis.</p>
              <div className="mt-6 h-px" style={{ background: `${COCOA}22` }} />
              <p className="mt-6 text-sm" style={{ color: `${COCOA}cc` }}>
                Hasta 2 personas por hogar · cancelás cuando quieras, sin permanencia.
              </p>
              <LinkButton href="/registro" variant="primary" className="mt-6 w-full justify-center uppercase tracking-[0.02em]">
                Crear tu hogar <ArrowRight size={18} />
              </LinkButton>
            </motion.div>
          </div>
        </section>

        {/* FAQ — Dark Cocoa stage. */}
        <section className="px-5 py-10 sm:px-10 md:py-16" style={{ background: COCOA }}>
          <div className="mx-auto max-w-3xl">
            <motion.div {...fadeInView} transition={{ duration: 0.5 }}>
              <Eyebrow tone={GOLD}>Preguntas frecuentes</Eyebrow>
              <h2 className={`mt-3 text-4xl leading-[1.0] tracking-[-0.02em] sm:text-6xl md:text-7xl ${subheadFont}`} style={{ color: CREAM }}>
                Dudas comunes sobre finanzas en pareja
              </h2>
            </motion.div>
            <motion.div
              className="mt-8 divide-y"
              style={{ borderColor: `${CREAM}33` }}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              {landingFaq.map((item) => (
                <details key={item.question} className="group py-5" style={{ borderColor: `${CREAM}33` }}>
                  <summary className="cursor-pointer list-none font-semibold marker:content-none" style={{ color: CREAM }}>
                    <span className="flex items-center justify-between gap-3">
                      {item.question}
                      <span className="shrink-0 group-open:rotate-45" style={{ color: GOLD }}>+</span>
                    </span>
                  </summary>
                  <p className="mt-2" style={{ color: `${CREAM}b3` }}>{item.answer}</p>
                </details>
              ))}
            </motion.div>
          </div>
        </section>

        {/* FINAL CTA — Cream stage, left-aligned (centering stays reserved for the hero). */}
        <section className="px-5 py-10 sm:px-10 md:py-16" style={{ background: CREAM }}>
          <motion.div
            className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-8 sm:flex-row sm:items-center"
            {...fadeInView}
            transition={{ duration: 0.5 }}
          >
            <div>
              <h2 className={`text-4xl leading-[1.0] tracking-[-0.02em] sm:text-6xl md:text-7xl ${subheadFont}`} style={{ color: COCOA }}>
                ¿Organizamos las cuentas de una vez?
              </h2>
              <p className="mt-4 max-w-md text-lg" style={{ color: `${COCOA}cc` }}>
                Crear el hogar toma menos de un minuto. Después, todo pasa por el chat.
              </p>
            </div>
            <LinkButton href="/registro" variant="primary" className="shrink-0 uppercase tracking-[0.02em]">
              Crear tu hogar <ArrowRight size={18} />
            </LinkButton>
          </motion.div>
        </section>

        {/* FOOTER — Dark Cocoa stage, mirrors the nav's tone per DESIGN.md. Both social-icon
            tiles stay Honeycomb Gold. */}
        <footer className="px-5 py-8 sm:px-10 sm:py-10" style={{ background: COCOA, color: CREAM }}>
          <div className="mx-auto flex max-w-6xl flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <Image src="/logo-mitimiti.png" alt="Miti-Miti" width={36} height={36} className="size-9 object-contain" />
              <p className="text-sm" style={{ color: `${CREAM}b3` }}>Finanzas en pareja, sin complicaciones.</p>
            </div>
            <div className="flex flex-wrap items-center gap-5 text-sm font-medium">
              <Link href="/login" className="hover:opacity-70">Entrar</Link>
              <Link href="/registro" className="hover:opacity-70">Crear hogar</Link>
              <Link href="/terminos" className="hover:opacity-70">Términos y privacidad</Link>
            </div>
            <div className="flex items-center gap-3 sm:justify-end" title="Muy pronto en redes sociales">
              <span className="grid size-10 place-items-center rounded-full" style={{ background: GOLD, color: COCOA }}>
                <Instagram size={17} />
              </span>
              <span className="grid size-10 place-items-center rounded-full" style={{ background: GOLD, color: COCOA }}>
                <Facebook size={17} />
              </span>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}
