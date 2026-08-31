"use client";

import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, useReducedMotion } from "framer-motion";
import { FloatingTransactionBadge, type TransactionBadgeData, type TransactionType } from "./floating-transaction-badge";

type PoolItem = { type: TransactionType; label: string; amount: string };

// Purely decorative sample data for the hero — never sent anywhere, never persisted, no relation
// to real accounts or movements.
const POOL: PoolItem[] = [
  { type: "expense", label: "Mercadona", amount: "−42,80 €" },
  { type: "expense", label: "Netflix", amount: "−12,99 €" },
  { type: "income", label: "Nómina", amount: "+1.850 €" },
  { type: "expense", label: "Café", amount: "−2,40 €" },
  { type: "saving", label: "Ahorro", amount: "+150 €" },
  { type: "expense", label: "Gasolina", amount: "−45,00 €" },
  { type: "income", label: "Bizum", amount: "+25,00 €" },
  { type: "expense", label: "Amazon", amount: "−34,90 €" },
  { type: "expense", label: "Restaurante", amount: "−38,00 €" },
  { type: "saving", label: "Fondo vacaciones", amount: "+100 €" },
];

// A single fixed, safe spot per layout tier — clear of the claim label, the title, and the CTA
// column — since only one notification is ever on screen at a time there's no slot/collision
// system to manage anymore.
// Centered near Piggy's phone (roughly title-right-edge to CTA-left-edge, at phone height),
// rather than tucked in a top corner — measured against the actual title/CTA bounding boxes at
// 1440×900 so it clears both regardless of exact video content.
const DESKTOP_POSITION: CSSProperties = { left: "36%", top: "62%" };
// Below lg the card (much bigger than the old pill badges) doesn't fit in the narrow gap between
// the title and the claim, so it sits below the CTA row instead, close to phone height, where
// there's ample clear space.
const MOBILE_POSITION: CSSProperties = { left: "6%", top: "72%" };

// ~8s between one notification and the next (visible time + the blur transition gap).
const VISIBLE_MS = 7000;
const GAP_MS = 1000;

let uid = 0;
function nextId() {
  uid += 1;
  return `tx-${uid}`;
}

function pickNext(excludeLabel: string | undefined): TransactionBadgeData {
  const candidates = POOL.filter((item) => item.label !== excludeLabel);
  const item = candidates[Math.floor(Math.random() * candidates.length)];
  return { id: nextId(), type: item.type, label: item.label, amount: item.amount };
}

/**
 * Purely decorative "movimientos" that appear one at a time near Piggy — a rotating pool of
 * made-up transactions shown as notification-style cards: blur in, stay briefly, blur out, then
 * hand off to the next one. Click/tap dismisses the current one early (the same state transition
 * that ends a card's normal visible period, so it re-uses the exact same "show the next one"
 * step). Never calls the backend, never persists anything. Starts only once `start` is true, so
 * it never competes with the hero's title-typing entrance.
 */
export function FloatingTransactions({ start }: { start: boolean }) {
  const reducedMotion = useReducedMotion();
  const [isDesktop, setIsDesktop] = useState(true);
  const [current, setCurrent] = useState<TransactionBadgeData | null>(null);
  const lastLabel = useRef<string | undefined>(undefined);

  useEffect(() => {
    // Matches the hero's xl: (1280px) breakpoint for switching to the 3-column row layout.
    const mq = window.matchMedia("(min-width: 1280px)");
    setIsDesktop(mq.matches);
    const onChange = (event: MediaQueryListEvent) => setIsDesktop(event.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Single state machine: a card showing schedules its own hide; no card showing schedules the
  // next one to appear. A manual dismiss (click) just sets current to null, which lands in the
  // same "schedule the next one" branch as a normal auto-hide.
  useEffect(() => {
    if (!start) return;
    if (current) {
      lastLabel.current = current.label;
      const timer = setTimeout(() => setCurrent(null), VISIBLE_MS);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(() => setCurrent(pickNext(lastLabel.current)), GAP_MS);
    return () => clearTimeout(timer);
  }, [start, current]);

  const dismiss = (id: string) => {
    setCurrent((prev) => (prev && prev.id === id ? null : prev));
  };

  if (!start) return null;

  return (
    <div className="absolute inset-0">
      <AnimatePresence mode="wait">
        {current && (
          <FloatingTransactionBadge
            key={current.id}
            data={current}
            position={isDesktop ? DESKTOP_POSITION : MOBILE_POSITION}
            onDismiss={dismiss}
            reducedMotion={!!reducedMotion}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
