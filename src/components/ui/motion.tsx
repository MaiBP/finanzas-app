"use client";

import { motion, type HTMLMotionProps } from "framer-motion";

export function FadeIn({ delay = 0, ...props }: { delay?: number } & HTMLMotionProps<"div">) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay }}
      {...props}
    />
  );
}

export function FloatBlob(props: HTMLMotionProps<"div">) {
  return (
    <motion.div
      aria-hidden
      animate={{ y: [0, -14, 0] }}
      transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      {...props}
    />
  );
}
