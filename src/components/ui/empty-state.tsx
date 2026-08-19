import type { LucideIcon } from "lucide-react";
import Image from "next/image";
import { LinkButton } from "@/components/ui/button";

export function EmptyState({
  icon: Icon,
  image,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  image?: string;
  title: string;
  description?: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <span className="grid size-14 place-items-center rounded-full bg-(--highlight)">
        {image ? <Image src={image} alt="" width={40} height={40} className="size-9 object-contain" /> : Icon ? <Icon size={24} /> : null}
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
