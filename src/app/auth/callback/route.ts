import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureDisplayNameEncrypted } from "@/lib/security/field-encryption";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next")?.startsWith("/") ? searchParams.get("next")! : "/app";
  const providerError=searchParams.get("error_description");
  if(providerError)return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(providerError)}`);
  // Confirming an email already happens server-side, inside Supabase, before this redirect is ever
  // reached — exchanging the code here would just log the user in as a side effect of clicking a
  // link in their inbox, which is exactly what we don't want for this flow. Skip it and send them
  // to log in on purpose instead.
  if(searchParams.get("type")==="signup"){
    // invite (not "code" — that name's taken by Supabase's own PKCE param above) carries a pending
    // household invite from signup() through the confirmation email and back to /login, which
    // already knows what to do with a ?code= of its own: show it, pre-fill it, and send a
    // successful login straight to /onboarding instead of /app.
    const invite=searchParams.get("invite");
    const codeParam=invite?`&code=${encodeURIComponent(invite)}`:"";
    return NextResponse.redirect(`${origin}/login?message=${encodeURIComponent("¡Cuenta confirmada! Inicia sesión para continuar.")}${codeParam}`);
  }
  if (code) {
    const supabase = await createClient();
    const {data,error}=await supabase.auth.exchangeCodeForSession(code);
    if(error)return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent("No se pudo completar el acceso con Google")}`);
    if(data.user)await ensureDisplayNameEncrypted(data.user.id);
  }
  return NextResponse.redirect(`${origin}${next}`);
}
