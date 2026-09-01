"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button, type ButtonSize, type ButtonVariant } from "@/components/ui/button";

export function SubmitButton({
  children,
  pendingText = "Guardando…",
  variant = "primary",
  size = "md",
  fullWidth = true,
  className,
}: {
  children: React.ReactNode;
  pendingText?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} variant={variant} size={size} className={`${fullWidth ? "w-full" : ""} ${className ?? ""}`}>
      {pending && <Loader2 size={17} className="animate-spin" />}
      {pending ? pendingText : children}
    </Button>
  );
}
