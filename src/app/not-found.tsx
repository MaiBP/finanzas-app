import Image from "next/image";
import type { Metadata } from "next";
import { LinkButton } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Página no encontrada",
  robots: { index: false, follow: false },
};

// Deliberately reads no cookies/session here — the root not-found boundary sits inside the root
// layout, so a dynamic API in it would force every other page sharing that layout (the landing
// page, /terminos, robots.txt, sitemap.xml) out of static generation too. A logged-in visitor
// landing on "/" just sees the marketing page and can click through to log in — a minor extra
// step, worth it to keep the rest of the app statically generated.
export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-5 px-5 text-center">
      <Image
        src="/finzy-mascot-thinking.png"
        alt=""
        width={320}
        height={263}
        className="w-28 rotate-6 sm:w-36"
      />
      <p className="w-fit bg-(--highlight) px-2 text-xs font-black uppercase tracking-wider">Error 404</p>
      <h1 className="text-3xl font-black tracking-tight md:text-4xl">Esta página no la encontramos</h1>
      <p className="max-w-sm text-(--muted)">
        Puede que el enlace esté roto o que la página ya no exista. Volvamos a un lugar conocido.
      </p>
      <LinkButton href="/">Ir al inicio</LinkButton>
    </main>
  );
}
