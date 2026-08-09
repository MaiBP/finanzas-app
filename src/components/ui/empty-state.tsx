import type { LucideIcon } from "lucide-react";
import { LinkButton } from "@/components/ui/button";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <span className="grid size-14 place-items-center rounded-full bg-(--highlight)">
        <Icon size={24} />
      </span>
      <p className="font-black">{title}</p>
      {description && <p className="max-w-sm text-sm text-(--muted)">{description}</p>}
      {action && (
        <LinkButton href={action.href} size="sm" className="mt-2">
          {action.label}
        </LinkButton>
      )}
    </div>
  );
}
