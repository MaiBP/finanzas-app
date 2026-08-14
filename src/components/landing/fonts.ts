import { Montserrat, Roboto } from "next/font/google";

// Scoped to the landing page only — the rest of the app keeps Archivo/Oswald from the root
// layout.
export const landingBody = Roboto({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--font-landing-body" });
export const landingDisplay = Montserrat({ subsets: ["latin"], weight: ["800"], variable: "--font-landing-display" });
