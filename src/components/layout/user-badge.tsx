import Image from "next/image";
import { UserRound } from "lucide-react";

/** Shown above "Cerrar sesión" — the Google profile photo when signed in with Google, otherwise
 * a plain icon (email/password accounts never get an avatar_url). */
export function UserBadge({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2">
      <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-full bg-(--highlight)">
        {avatarUrl ? (
          <Image src={avatarUrl} alt="" width={36} height={36} className="size-9 object-cover" />
        ) : (
          <UserRound size={18} />
        )}
      </span>
      <p className="min-w-0 truncate text-sm font-black">{name}</p>
    </div>
  );
}
