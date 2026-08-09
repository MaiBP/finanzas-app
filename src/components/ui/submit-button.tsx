"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button, type ButtonVariant } from "@/components/ui/button";

export function SubmitButton({
  children,
  pendingText = "Guardando…",
  variant = "primary",
  className,
}: {
  children: React.ReactNode;
  pendingText?: string;
  variant?: ButtonVariant;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} variant={variant} className={`w-full ${className ?? ""}`}>
      {pending && <Loader2 size={17} className="animate-spin" />}
      {pending ? pendingText : children}
    </Button>
  );
}
