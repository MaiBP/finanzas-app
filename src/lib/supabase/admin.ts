import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key?.startsWith("sb_secret_")) throw new Error("Supabase Admin no está configurado con una Secret key válida");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}
