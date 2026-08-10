import type { Metadata } from "next";
import { Archivo, Oswald } from "next/font/google";
import "./globals.css";

const interfaceFont = Archivo({ subsets: ["latin"], variable: "--font-interface" });
const displayFont = Oswald({ subsets: ["latin"], variable: "--font-display" });

const siteUrl = (process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "")) || "https://finanzas-app-six-kappa.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    template: "%s · Miti-Miti",
    default: "Miti-Miti | Finanzas en pareja fáciles con IA",
  },
  description:
    "Gestiona tus finanzas en pareja de forma sencilla. Registra gastos e ingresos hablando con tu asistente financiero y controla tu dinero desde un único lugar.",
  applicationName: "Miti-Miti",
  keywords: [
    "finanzas en pareja",
    "app de finanzas para parejas",
    "gastos compartidos",
    "presupuesto en pareja",
    "controlar gastos en pareja",
    "asistente financiero con IA",
    "registrar gastos por Telegram",
  ],
  openGraph: {
    type: "website",
    locale: "es_ES",
    siteName: "Miti-Miti",
    title: "Miti-Miti | Finanzas en pareja fáciles con IA",
    description:
      "Gestiona tus finanzas en pareja de forma sencilla. Registra gastos e ingresos hablando con tu asistente financiero y controla tu dinero desde un único lugar.",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "Miti-Miti | Finanzas en pareja fáciles con IA",
    description:
      "Gestiona tus finanzas en pareja de forma sencilla. Registra gastos e ingresos hablando con tu asistente financiero.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es" className={`${interfaceFont.variable} ${displayFont.variable}`}><body>{children}</body></html>;
}
