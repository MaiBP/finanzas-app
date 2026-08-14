"use client";

import { motion, useScroll, useTransform } from "framer-motion";

// The app's own brand colors, in a sequence that reads as a lap of the palette rather than a
// random shuffle — orange (canvas) → blue → lilac → lime → pink → back to canvas at the footer.
const COLORS = ["#ff9655", "#73c8dc", "#e19bf5", "#87cd64", "#ff96be", "#ff9655"];

function hexToRgb(hex: string): [number, number, number] {
  const value = hex.replace("#", "");
  return [parseInt(value.slice(0, 2), 16), parseInt(value.slice(2, 4), 16), parseInt(value.slice(4, 6), 16)];
}

const RGB_COLORS = COLORS.map(hexToRgb);

// Mixes the two nearest keyframe colors by hand and returns a plain rgb() string. Handing an
// array of >2 colors straight to useTransform's range form makes framer-motion represent the
// in-between state as a two-color linear-gradient instead of a solid color, which is not what we
// want for a full-page background — this keeps it a single flat color at every scroll position.
function mixColors(progress: number): string {
  const segments = RGB_COLORS.length - 1;
  const scaled = Math.min(Math.max(progress, 0), 1) * segments;
  const index = Math.min(Math.floor(scaled), segments - 1);
  const localT = scaled - index;
  const [r1, g1, b1] = RGB_COLORS[index];
  const [r2, g2, b2] = RGB_COLORS[index + 1];
  const r = Math.round(r1 + (r2 - r1) * localT);
  const g = Math.round(g1 + (g2 - g1) * localT);
  const b = Math.round(b1 + (b2 - b1) * localT);
  return `rgb(${r}, ${g}, ${b})`;
}

export function ScrollBackground() {
  const { scrollYProgress } = useScroll();
  const backgroundColor = useTransform(scrollYProgress, mixColors);

  return <motion.div aria-hidden style={{ backgroundColor }} className="fixed inset-0 -z-10" />;
}
