"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";

const STORE_LINKS = {
  android: { label: "Descargar en Google Play", href: "https://play.google.com/store/apps/details?id=org.telegram.messenger" },
  ios: { label: "Descargar en App Store", href: "https://apps.apple.com/app/telegram-messenger/id686449807" },
  other: { label: "Descargar Telegram", href: "https://telegram.org/dl" },
} as const;

function detectPlatform(): keyof typeof STORE_LINKS {
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return "android";
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  return "other";
}

export function TelegramDownloadLink() {
  const [open, setOpen] = useState(false);
  // Starts as "other" to match the server-rendered HTML, then swaps to the real platform
  // right after mount — computing it during render would mismatch SSR (no navigator there).
  const [platform, setPlatform] = useState<keyof typeof STORE_LINKS>("other");
  useEffect(() => setPlatform(detectPlatform()), []);
  const store = STORE_LINKS[platform];

  return (
    <div className="mt-4 text-center text-sm">
      <button type="button" onClick={() => setOpen((value) => !value)} className="inline-flex items-center gap-1 font-bold text-(--ink)/70 underline">
        ¿No tenés Telegram? <ChevronDown size={15} className={open ? "rotate-180 transition" : "transition"} />
      </button>
      {open && (
        <p className="mt-2">
          <a href={store.href} target="_blank" rel="noreferrer" className="font-bold underline">
            {store.label}
          </a>
          {" "}e instalalo antes de tocar &quot;Abrir Telegram&quot; de nuevo.
        </p>
      )}
    </div>
  );
}
