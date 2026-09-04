"use client";

import { useState } from "react";
import { SubmitButton } from "@/components/ui/submit-button";
import { Button, type ButtonSize, type ButtonVariant } from "@/components/ui/button";
import { ReadOnlyModal } from "./read-only-modal";

/** Drop-in replacement for SubmitButton that, once a household is read-only, never lets the form
 * submit at all — the button becomes a plain (non-submit) trigger for the ReadOnlyModal instead.
 * Keeps every other page reachable/browsable as normal; only the mutating action itself is
 * blocked, right where the user tries to take it. */
export function GuardedSubmitButton({
  isWritable,
  children,
  pendingText,
  variant = "primary",
  size = "md",
  fullWidth = true,
  className,
}: {
  isWritable: boolean;
  children: React.ReactNode;
  pendingText?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  if (isWritable) {
    return (
      <SubmitButton pendingText={pendingText} variant={variant} size={size} fullWidth={fullWidth} className={className}>
        {children}
      </SubmitButton>
    );
  }
  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={`${fullWidth ? "w-full" : ""} ${className ?? ""}`}
        onClick={() => setOpen(true)}
      >
        {children}
      </Button>
      <ReadOnlyModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
