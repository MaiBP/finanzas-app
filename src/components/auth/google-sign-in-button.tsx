"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function GoogleSignInButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  async function signInWithGoogle() {
    setPending(true);
    setError(undefined);
    const supabase = createClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/app` },
    });
    if (oauthError) {
      setError("No se pudo iniciar el acceso con Google.");
      setPending(false);
    }
  }

  return (
    <div>
      <Button type="button" onClick={signInWithGoogle} disabled={pending} className="w-full">
        <span className="grid size-6 place-items-center rounded-full bg-white text-sm font-black text-[#4285f4]">
          G
        </span>
        {pending ? "Conectando con Google…" : "Continuar con Google"}
      </Button>
      {error && <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    </div>
  );
}
