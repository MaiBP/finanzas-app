import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

const COCOA = "#3b2722";

/**
 * The visual language shared by the hero's floating "movimientos" and the static "Movimientos de
 * hoy" showcase card: a frosted-glass notification (icon left, bold heading + detail line,
 * "Ahora"/"Miti-Miti" corner labels). Purely presentational — no motion, no positioning, no
 * dismiss handling, so it drops into either a floating hero badge or a plain in-flow list item.
 */
export function NotificationCard({
  icon: Icon,
  iconBg,
  iconFg,
  heading,
  detail,
  className,
  radiusClassName = "rounded-2xl",
  background = "rgba(255,255,255,0.16)",
  borderColor = "rgba(255,255,255,0.4)",
}: {
  icon: LucideIcon;
  iconBg: string;
  iconFg: string;
  heading: string;
  detail: ReactNode;
  className?: string;
  radiusClassName?: string;
  background?: string;
  borderColor?: string;
}) {
  return (
    <div
      className={`flex items-start gap-3 ${radiusClassName} border px-4 py-3.5 text-left backdrop-blur-xl ${className ?? ""}`}
      style={{ background, borderColor }}
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-full" style={{ background: iconBg, color: iconFg }}>
        <Icon size={16} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className="text-sm font-bold" style={{ color: COCOA }}>
            {heading}
          </span>
          <span className="shrink-0 text-[10px] font-semibold tracking-wide uppercase" style={{ color: `${COCOA}99` }}>
            Ahora
          </span>
        </span>
        <span className="mt-0.5 flex items-baseline justify-between gap-2">
          <span className="truncate text-sm" style={{ color: `${COCOA}dd` }}>
            {detail}
          </span>
          <span className="shrink-0 text-[10px] italic" style={{ color: `${COCOA}80` }}>
            Miti-Miti
          </span>
        </span>
      </span>
    </div>
  );
}
