"use client";

import type { CSSProperties } from "react";
import { motion } from "framer-motion";
import { PiggyBank, ShoppingCart, Wallet } from "lucide-react";
import { NotificationCard } from "./notification-card";

export type TransactionType = "expense" | "income" | "saving";

export type TransactionBadgeData = {
  id: string;
  type: TransactionType;
  label: string;
  amount: string;
};

const COCOA = "#3b2722";
const CREAM = "#f2ebd0";
const GOLD = "#ffca50";
const BARN_RED = "#a0342a";
const BLUE = "#6aacc2";

// Category → icon/avatar/heading mapping reuses Miti-Miti's existing hero palette (gold, barn
// red, cornflower blue) instead of introducing new chromatic colors.
const CATEGORY = {
  expense: { icon: ShoppingCart, avatarBg: BARN_RED, avatarFg: CREAM, heading: "Nuevo gasto" },
  income: { icon: Wallet, avatarBg: GOLD, avatarFg: COCOA, heading: "Nuevo ingreso" },
  saving: { icon: PiggyBank, avatarBg: BLUE, avatarFg: COCOA, heading: "Nuevo ahorro" },
} as const;

// The floating, dismissible version of NotificationCard — same frosted-glass visual, plus
// positioning, entrance/exit blur transitions, and click-to-dismiss.
export function FloatingTransactionBadge({
  data,
  position,
  onDismiss,
  reducedMotion,
}: {
  data: TransactionBadgeData;
  position: CSSProperties;
  onDismiss: (id: string) => void;
  reducedMotion: boolean;
}) {
  const category = CATEGORY[data.type];

  return (
    <motion.button
      type="button"
      data-button-theme="custom"
      tabIndex={-1}
      aria-hidden="true"
      onClick={() => onDismiss(data.id)}
      className="pointer-events-auto absolute w-72 cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98]"
      style={position}
      initial={{ opacity: 0, filter: "blur(10px)", scale: 0.94, y: 6 }}
      animate={{ opacity: 1, filter: "blur(0px)", scale: 1, y: 0 }}
      exit={{ opacity: 0, filter: "blur(10px)", scale: 0.96, y: -4 }}
      transition={reducedMotion ? { duration: 0.15 } : { duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
    >
      <NotificationCard
        icon={category.icon}
        iconBg={category.avatarBg}
        iconFg={category.avatarFg}
        heading={category.heading}
        detail={`${data.label} · ${data.amount}`}
        radiusClassName="rounded-3xl"
        background="rgba(255,255,255,0.4)"
        borderColor="rgba(255,255,255,0.55)"
      />
    </motion.button>
  );
}
