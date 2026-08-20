"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";

const TONES = {
  blue: "bg-(--blue)",
  lime: "bg-(--lime)",
  lilac: "bg-(--lilac)",
} as const;

export function AuthCard({
  title,
  subtitle,
  children,
  footer,
  tone = "blue",
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
  tone?: keyof typeof TONES;
}) {
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden px-5 py-10">
      <motion.div
        aria-hidden
        className="absolute -left-24 top-16 size-52 rounded-full bg-(--blue) opacity-80"
        animate={{ y: [0, 14, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="absolute -right-20 bottom-10 size-64 rounded-full bg-(--lilac) opacity-75"
        animate={{ y: [0, -16, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <div aria-hidden className="absolute -bottom-20 left-1/3 size-40 rotate-12 bg-(--lime) opacity-70" />

      <motion.div
        className="relative z-10 w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Link href="/" className="mb-7 flex items-center justify-center">
          <Image src="/logo-mitimiti.png" alt="Miti-Miti" width={72} height={72} className="size-18 object-contain" />
        </Link>

        <section className="card overflow-hidden">
          <div className="grid h-2 grid-cols-4">
            <span className="bg-(--blue)" />
            <span className="bg-(--lime)" />
            <span className="bg-(--lilac)" />
            <span className="bg-(--expense)" />
          </div>
          <header className={`${TONES[tone]} border-b border-(--ink)/20 p-7 md:px-9`}>
            <p className="mb-3 w-fit bg-(--highlight) px-1 text-xs font-black uppercase tracking-wider">
              Tu dinero, bien organizado
            </p>
            <h1 className="text-3xl font-black tracking-tight">{title}</h1>
            <p className="mt-2 max-w-sm text-(--ink)/80">{subtitle}</p>
          </header>
          <div className="bg-white p-7 md:p-9">
            <div>{children}</div>
            <div className="mt-6 border-t border-(--ink)/15 pt-5 text-center text-sm text-(--muted)">{footer}</div>
          </div>
        </section>
      </motion.div>
    </main>
  );
}
