import type { LucideIcon } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/cn";

const TONES = {
  green: "bg-(--lime)",
  coral: "bg-(--expense)",
  lilac: "bg-(--lilac)",
  plain: "bg-(--savings)",
} as const;

export type StatTileTone = keyof typeof TONES;

export function StatTile({
  label,
  value,
  detail,
  tone = "green",
  compact = false,
  icon: Icon,
  image,
  breakdown,
}: {
  label: string;
  value: string;
  detail?: string;
  tone?: StatTileTone;
  compact?: boolean;
  icon?: LucideIcon;
  image?: string;
  breakdown?: { label: string; value: string }[];
}) {
  return (
    <div className="relative">
      {image && (
        <Image
          src={image}
          alt=""
          width={96}
          height={96}
          className="absolute -top-5 -right-4 z-10 size-16 rotate-6 object-contain drop-shadow-[3px_3px_0_rgba(58,52,52,0.18)]"
        />
      )}
      <article className={cn("min-w-0 overflow-hidden rounded-lg border-2 border-(--ink) p-5 shadow-[6px_6px_0_0_var(--ink)]", TONES[tone])}>
        <div className="flex items-start justify-between gap-2">
          <p className="w-fit bg-(--highlight) px-1 text-xs font-bold uppercase tracking-wide text-(--ink)">
            {label}
          </p>
          {Icon && !image && (
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white/70">
              <Icon size={16} />
            </span>
          )}
        </div>
        {/* whitespace-nowrap keeps the amount on one line instead of wrapping between the number
            and the currency sign; a smaller size on narrow screens is what actually makes that
            fit, since money values shouldn't ever be truncated/ellipsized. Compact (the insight
            sentence) keeps normal wrapping — only the money tiles get nowrap. */}
        <p className={cn("mt-2 font-black tracking-tight", compact ? "text-lg leading-snug" : "whitespace-nowrap text-lg sm:text-2xl")}>{value}</p>
        {detail && <p className="mt-1 w-fit bg-(--highlight) px-1 text-xs text-(--ink)">{detail}</p>}
        {breakdown && breakdown.length > 0 && (
          <ul className="mt-2 space-y-0.5 border-t border-(--ink)/15 pt-2 text-xs">
            {breakdown.map((item) => (
              <li key={item.label} className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate text-(--ink)/75">{item.label}</span>
                <span className="shrink-0 font-bold">{item.value}</span>
              </li>
            ))}
          </ul>
        )}
      </article>
    </div>
  );
}
