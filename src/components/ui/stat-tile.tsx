import type { LucideIcon } from "lucide-react";
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
}: {
  label: string;
  value: string;
  detail?: string;
  tone?: StatTileTone;
  compact?: boolean;
  icon?: LucideIcon;
}) {
  return (
    <article className={cn("rounded-sm border border-(--ink)/20 p-5", TONES[tone])}>
      <div className="flex items-start justify-between gap-2">
        <p className="w-fit bg-(--highlight) px-1 text-xs font-bold uppercase tracking-wide text-(--ink)">
          {label}
        </p>
        {Icon && (
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white/70">
            <Icon size={16} />
          </span>
        )}
      </div>
      <p className={cn("mt-2 font-black tracking-tight", compact ? "text-lg leading-snug" : "text-2xl")}>{value}</p>
      {detail && <p className="mt-1 w-fit bg-(--highlight) px-1 text-xs text-(--ink)">{detail}</p>}
    </article>
  );
}
