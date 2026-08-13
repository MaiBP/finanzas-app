import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { createCipheriv, randomBytes } from "node:crypto";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key?.startsWith("sb_secret_")) throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SECRET_KEY válidas.");
const encryptionKeyRaw = process.env.FIELD_ENCRYPTION_KEY;
if (!encryptionKeyRaw) throw new Error("Falta FIELD_ENCRYPTION_KEY.");
const encryptionKey = Buffer.from(encryptionKeyRaw, "base64");
if (encryptionKey.length !== 32) throw new Error("FIELD_ENCRYPTION_KEY debe ser una clave de 32 bytes en base64.");

// Kept in sync with src/lib/security/field-encryption.ts's format (this script runs outside the
// Next.js/TS build, as a one-off, so it can't import that module directly).
const PREFIX = "enc:v1:";
const ALGORITHM = "aes-256-gcm";

function isEncrypted(value) {
  return typeof value === "string" && value.startsWith(PREFIX);
}

function encryptField(plaintext) {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, encryptionKey, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, authTag, ciphertext]).toString("base64");
}

const db = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
const dryRun = !process.argv.includes("--confirm-backfill");
const PAGE_SIZE = 500;

async function backfillColumn(table, column) {
  let processed = 0;
  let updated = 0;
  let offset = 0;
  while (true) {
    const { data, error } = await db.from(table).select(`id,${column}`).not(column, "is", null).order("id").range(offset, offset + PAGE_SIZE - 1);
    if (error) throw error;
    if (!data.length) break;
    for (const row of data) {
      processed++;
      const value = row[column];
      if (isEncrypted(value)) continue;
      updated++;
      if (!dryRun) {
        const { error: updateError } = await db.from(table).update({ [column]: encryptField(value) }).eq("id", row.id);
        if (updateError) throw updateError;
      }
    }
    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  return { processed, updated };
}

const profiles = await backfillColumn("profiles", "display_name");
const transactions = await backfillColumn("transactions", "description");
console.log(JSON.stringify({ mode: dryRun ? "dry-run" : "backfill", profiles, transactions }, null, 2));
if (dryRun) console.log("Vuelve a ejecutar con --confirm-backfill para aplicar los cambios.");
