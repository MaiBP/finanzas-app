import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = {
  title: "Contacto",
  description: "Escribinos tus consultas, sugerencias o problemas con Miti-Miti.",
};

export default function ContactoPage() {
  return (
    <main className="mx-auto min-h-screen max-w-2xl px-5 py-12">
      <Link href="/" className="mb-8 flex items-center gap-2 text-sm font-bold">
        <ArrowLeft size={17} /> Volver
      </Link>
      <p className="w-fit bg-(--highlight) px-2 text-xs font-black uppercase tracking-wider">Miti-Miti</p>
      <h1 className="mt-4 text-3xl font-black tracking-tight md:text-4xl">Contacto</h1>
      <p className="mt-2 text-(--muted)">¿Consulta, sugerencia o algo que no funciona como esperabas? Escribinos.</p>

      <div className="card mt-8 p-6 md:p-8">
        <ContactForm />
      </div>

      <p className="mt-6 text-sm text-(--muted)">
        También podés escribirnos directamente a{" "}
        <a className="font-bold underline" href="mailto:hello@miti-miti.com">
          hello@miti-miti.com
        </a>
        .
      </p>
    </main>
  );
}
