"use client";

import { motion, useScroll, useTransform } from "framer-motion";

// The app's own brand colors, in a sequence that reads as a lap of the palette rather than a
// random shuffle — orange (canvas) → blue → lilac → lime → pink → back to canvas at the footer.
const COLORS = ["#ff9655", "#73c8dc", "#e19bf5", "#87cd64", "#ff96be", "#ff9655"];
const STOPS = COLORS.map((_, index) => index / (COLORS.length - 1));

export function ScrollBackground() {
  const { scrollYProgress } = useScroll();
  const backgroundColor = useTransform(scrollYProgress, STOPS, COLORS);

  return <motion.div aria-hidden style={{ backgroundColor }} className="fixed inset-0 -z-10" />;
}
