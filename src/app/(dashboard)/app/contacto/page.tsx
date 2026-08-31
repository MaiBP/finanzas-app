import { ContactForm } from "@/app/contacto/contact-form";

export default function ContactoAppPage() {
  return (
    <>
      <p className="text-sm font-bold uppercase">Herramienta general</p>
      <h1 className="mt-1 text-3xl font-black">Contacto</h1>
      <p className="mt-2 max-w-2xl text-(--muted)">
        ¿Consulta, sugerencia o algo que no funciona como esperabas? Escribinos.
      </p>
      <section className="card mt-7 max-w-2xl p-6 md:p-8">
        <ContactForm />
      </section>
      <p className="mt-6 max-w-2xl text-sm text-(--muted)">
        También podés escribirnos directamente a{" "}
        <a className="font-bold underline" href="mailto:hello@miti-miti.com">
          hello@miti-miti.com
        </a>
        .
      </p>
    </>
  );
}
