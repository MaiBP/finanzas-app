"use client";

import { motion } from "framer-motion";

const TONES = {
  error: "bg-red-50 text-red-700",
  success: "bg-green-50 text-green-800",
} as const;

export function Banner({ kind, children }: { kind: keyof typeof TONES; children: React.ReactNode }) {
  if (!children) return null;
  return (
    <motion.p
      role={kind === "error" ? "alert" : "status"}
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`mb-4 rounded-xl p-3 text-sm ${TONES[kind]}`}
    >
      {children}
    </motion.p>
  );
}
