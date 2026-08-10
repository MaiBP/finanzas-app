import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/landing-page";
import { landingFaq } from "@/content/landing-faq";

export const metadata: Metadata = {
  title: "Finanzas en pareja fáciles con IA",
  description:
    "Gestiona tus finanzas en pareja de forma sencilla. Registra gastos e ingresos hablando con tu asistente financiero y controla tu dinero desde un único lugar.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Miti-Miti | Finanzas en pareja fáciles con IA",
    description:
      "Gestiona tus finanzas en pareja de forma sencilla. Registra gastos e ingresos hablando con tu asistente financiero y controla tu dinero desde un único lugar.",
    url: "/",
  },
};

const softwareApplicationSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Miti-Miti",
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web",
  description:
    "Aplicación de finanzas en pareja: registra y consulta gastos e ingresos compartidos y personales hablando con un asistente financiero con inteligencia artificial, por web o por Telegram.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "EUR",
  },
};

const faqPageSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: landingFaq.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  })),
};

export default function Page() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplicationSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPageSchema) }} />
      <LandingPage />
    </>
  );
}
