"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

const displayFont = "font-(family-name:--font-landing-display)";

// "Finanzas en pareja." / "tan fácil" / "como enviar" are static from the very first paint — no
// typing animation on them. Only the last line loops through a continuous type→hold→erase→hold
// cycle (recreating the reference CodePen's rhythm), so it reads like a message that's always
// mid-typing rather than a headline typing itself out.
const FIXED_LINES = ["Finanzas en pareja.", "tan fácil", "como enviar"];
const LOOP_WORD = "un mensaje";

const LOOP_TYPE_MS = 90;
const LOOP_ERASE_MS = 55;
const LOOP_HOLD_TYPED_MS = 1800;
const LOOP_HOLD_ERASED_MS = 700;

// A text-cursor bar. `solid` (no blink) reads as "actively typing/erasing right now", matching
// the reference CodePen's cursor, which only blinks during the hold pauses.
function TypingCursor({ color, solid }: { color: string; solid?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`ml-1 inline-block h-[0.8em] w-0.75 align-middle ${solid ? "" : "cursor-blink"}`}
      style={{ background: color }}
    />
  );
}

type LoopPhase = "typing" | "erasing";

// Continuous type→hold→erase→hold loop for a single word/phrase. Only two phases are needed: the
// "hold" pauses are just the delay before typing (once fully typed) advances to erasing, and
// before erasing (once fully erased) advances back to typing — no separate hold state required.
// `onFirstTypeComplete` fires once, the first time the word finishes typing, so the caller can
// reveal the rest of the hero without waiting for every subsequent loop.
function useTypewriterLoop(word: string, enabled: boolean, onFirstTypeComplete?: () => void) {
  const [visibleChars, setVisibleChars] = useState(0);
  const [phase, setPhase] = useState<LoopPhase>("typing");
  const firedRef = useRef(false);
  const onFirstTypeCompleteRef = useRef(onFirstTypeComplete);
  onFirstTypeCompleteRef.current = onFirstTypeComplete;

  useEffect(() => {
    if (!enabled) return undefined;

    if (phase === "typing") {
      if (visibleChars < word.length) {
        const timer = setTimeout(() => setVisibleChars((n) => n + 1), LOOP_TYPE_MS);
        return () => clearTimeout(timer);
      }
      if (!firedRef.current) {
        firedRef.current = true;
        onFirstTypeCompleteRef.current?.();
      }
      const timer = setTimeout(() => setPhase("erasing"), LOOP_HOLD_TYPED_MS);
      return () => clearTimeout(timer);
    }

    if (visibleChars > 0) {
      const timer = setTimeout(() => setVisibleChars((n) => n - 1), LOOP_ERASE_MS);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(() => setPhase("typing"), LOOP_HOLD_ERASED_MS);
    return () => clearTimeout(timer);
  }, [enabled, phase, visibleChars, word.length]);

  // Solid (non-blinking) cursor only while a character is actually being added/removed this
  // instant — during the hold pauses (visibleChars sitting at 0 or word.length) it blinks instead.
  const isActive = (phase === "typing" && visibleChars < word.length) || (phase === "erasing" && visibleChars > 0);
  return { text: word.slice(0, visibleChars), isActive };
}

/**
 * The hero's main line: three fixed lines rendered as plain static text, followed by a fourth
 * line that loops "un mensaje" through a continuous type→hold→erase→hold cycle. `onComplete`
 * fires once the loop's first pass finishes typing, so the caller can gate the rest of the hero's
 * reveal; under prefers-reduced-motion the loop line renders statically too (no cursor, no
 * animation) and onComplete fires immediately instead.
 */
export function HeroTitle({ color, onComplete }: { color: string; onComplete?: () => void }) {
  const reducedMotion = useReducedMotion();
  const skip = !!reducedMotion;

  const loop = useTypewriterLoop(LOOP_WORD, !skip, onComplete);

  useEffect(() => {
    if (skip) onComplete?.();
    // Intentionally run once on mount: firing this again on every re-render (e.g. from an inline
    // onComplete callback identity change) would call it repeatedly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <h1 className={`text-3xl leading-[0.88] tracking-[-0.01em] sm:text-[42px] xl:text-[34px] ${displayFont}`} style={{ color }}>
      {FIXED_LINES.map((line, i) => (
        <span key={i} className="block">
          {line}
        </span>
      ))}
      <span className="block">
        {skip ? LOOP_WORD : loop.text}
        {!skip && <TypingCursor color={color} solid={loop.isActive} />}
      </span>
    </h1>
  );
}
