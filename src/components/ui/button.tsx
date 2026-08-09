import Link from "next/link";
import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "inverse" | "outline";
export type ButtonSize = "md" | "sm" | "icon";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-full border font-bold transition disabled:pointer-events-none disabled:opacity-60";

const SIZES: Record<ButtonSize, string> = {
  md: "px-6 py-3.5 text-sm",
  sm: "px-4 py-2.5 text-xs",
  icon: "size-12 p-0 text-sm",
};

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "border-(--ink) bg-(--highlight) text-(--ink) hover:-translate-y-0.5 hover:bg-(--ink) hover:text-(--highlight) hover:shadow-[4px_4px_0_rgba(58,52,52,0.18)] active:translate-y-0 active:shadow-none",
  inverse:
    "border-(--ink) bg-(--ink) text-(--highlight) hover:-translate-y-0.5 hover:bg-(--highlight) hover:text-(--ink) hover:shadow-[4px_4px_0_rgba(58,52,52,0.18)] active:translate-y-0 active:shadow-none",
  outline:
    "border-(--ink)/60 bg-transparent text-(--ink) hover:-translate-y-0.5 hover:border-(--ink) hover:bg-(--ink) hover:text-(--highlight) active:translate-y-0",
};

export function buttonClasses(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string) {
  return cn(BASE, SIZES[size], VARIANTS[variant], className);
}

type ButtonProps = ComponentPropsWithoutRef<"button"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({ variant = "primary", size = "md", className, ...props }: ButtonProps) {
  return <button data-button-theme="custom" className={buttonClasses(variant, size, className)} {...props} />;
}

type LinkButtonProps = ComponentPropsWithoutRef<typeof Link> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function LinkButton({ variant = "primary", size = "md", className, ...props }: LinkButtonProps) {
  return <Link data-button-theme="custom" className={buttonClasses(variant, size, className)} {...props} />;
}
