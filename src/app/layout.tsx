import type { Metadata } from "next";
import { Archivo, Oswald } from "next/font/google";
import "./globals.css";

const interfaceFont = Archivo({ subsets: ["latin"], variable: "--font-interface" });
const displayFont = Oswald({ subsets: ["latin"], variable: "--font-display" });

export const metadata: Metadata = {
  title: "A medias · Finanzas en pareja",
  description: "Un lugar sencillo para organizar el dinero que compartís.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es" className={`${interfaceFont.variable} ${displayFont.variable}`}><body>{children}</body></html>;
}
