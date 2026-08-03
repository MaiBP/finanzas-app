import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "A medias · Finanzas en pareja",
  description: "Un lugar sencillo para organizar el dinero que compartís.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
