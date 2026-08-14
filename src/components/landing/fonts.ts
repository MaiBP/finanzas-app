import { Lora, Open_Sans } from "next/font/google";

// Scoped to the landing page only — the rest of the app keeps Archivo/Oswald from the root
// layout.
export const landingBody = Lora({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-landing-body" });
export const landingDisplay = Open_Sans({ subsets: ["latin"], weight: ["800"], variable: "--font-landing-display" });
