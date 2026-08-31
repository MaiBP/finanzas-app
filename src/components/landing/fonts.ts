import { DM_Serif_Display, Inter, Playfair_Display } from "next/font/google";

// Scoped to the landing page only — the rest of the app keeps Archivo/Oswald from the root
// layout. Follows DESIGN.md's "Busy Bee Honey" substitute list: Playfair Display Black stands in
// for "TayMakawao" (the mega-display billboard face, 800/900 only — this app's hero/section
// titles never need the 700 weight that role calls for), DM Serif Display stands in for
// "Barkman Honey" (the warmer secondary-display serif for subheads/large numerals — deliberately
// a different family from the display, so the two read as distinct "drip" vs. "mechanical"
// weights per the brief), and Inter stands in for "TayBirdie" (the UI/small-body workhorse).
export const landingDisplay = Playfair_Display({ subsets: ["latin"], weight: ["800", "900"], variable: "--font-landing-display" });
export const landingSubhead = DM_Serif_Display({ subsets: ["latin"], weight: ["400"], variable: "--font-landing-subhead" });
export const landingBody = Inter({ subsets: ["latin"], weight: ["400", "600", "700"], variable: "--font-landing-body" });
