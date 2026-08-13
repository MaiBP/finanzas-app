"use client";

import { motion } from "framer-motion";
import type { ComponentPropsWithoutRef } from "react";

type SvgDoodleProps = ComponentPropsWithoutRef<typeof motion.svg>;

export function ArrowDoodle(props: SvgDoodleProps) {
  return (
    <motion.svg
      aria-hidden
      viewBox="0 0 100 100"
      fill="none"
      initial={{ opacity: 0, scale: 0.85 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5 }}
      {...props}
    >
      <path d="M12 18 C 45 8, 70 35, 58 75" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
      <path d="M39 66 L58 75 L51 54" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    </motion.svg>
  );
}

export function StarDoodle(props: SvgDoodleProps) {
  return (
    <motion.svg
      aria-hidden
      viewBox="0 0 100 100"
      fill="none"
      initial={{ opacity: 0, rotate: -12, scale: 0.85 }}
      whileInView={{ opacity: 1, rotate: 0, scale: 1 }}
      viewport={{ once: true, margin: "-40px" }}
      animate={{ rotate: [0, 8, 0, -8, 0] }}
      transition={{ rotate: { duration: 7, repeat: Infinity, ease: "easeInOut" }, default: { duration: 0.5 } }}
      {...props}
    >
      <path
        d="M50 5 L61 38 L96 38 L67 59 L78 92 L50 71 L22 92 L33 59 L4 38 L39 38 Z"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinejoin="round"
      />
    </motion.svg>
  );
}
