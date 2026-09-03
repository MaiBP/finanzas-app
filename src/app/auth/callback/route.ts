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
    return NextResponse.redirect(`${origin}/login?message=${encodeURIComponent("¡Cuenta confirmada! Inicia sesión para continuar.")}`);
  }
  if (code) {
    const supabase = await createClient();
    const {data,error}=await supabase.auth.exchangeCodeForSession(code);
    if(error)return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent("No se pudo completar el acceso con Google")}`);
    if(data.user)await ensureDisplayNameEncrypted(data.user.id);
  }
  return NextResponse.redirect(`${origin}${next}`);
}
