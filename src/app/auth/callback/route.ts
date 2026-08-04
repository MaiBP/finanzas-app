import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next")?.startsWith("/") ? searchParams.get("next")! : "/app";
  const providerError=searchParams.get("error_description");
  if(providerError)return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(providerError)}`);
  if (code) { const supabase = await createClient(); const {error}=await supabase.auth.exchangeCodeForSession(code);if(error)return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent("No se pudo completar el acceso con Google")}`); }
  return NextResponse.redirect(`${origin}${next}`);
}
