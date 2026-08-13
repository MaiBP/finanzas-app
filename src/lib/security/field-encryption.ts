import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

const ALGORITHM = "aes-256-gcm";
const PREFIX = "enc:v1:";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getKey(): Buffer {
  const key = process.env.FIELD_ENCRYPTION_KEY;
  if (!key) throw new Error("FIELD_ENCRYPTION_KEY no está configurada");
  const buffer = Buffer.from(key, "base64");
  if (buffer.length !== 32) throw new Error("FIELD_ENCRYPTION_KEY debe ser una clave de 32 bytes en base64");
  return buffer;
}

export function encryptField(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, authTag, ciphertext]).toString("base64");
}

export function isEncryptedField(stored: string): boolean {
  return stored.startsWith(PREFIX);
}

/** Tolerates legacy plaintext rows (no prefix) so a partial backfill never breaks a read. */
export function decryptField(stored: string): string {
  if (!isEncryptedField(stored)) return stored;
  const key = getKey();
  const raw = Buffer.from(stored.slice(PREFIX.length), "base64");
  const iv = raw.subarray(0, IV_LENGTH);
  const authTag = raw.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = raw.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

/**
 * The only INSERT into profiles.display_name is a DB trigger (handle_new_user), so the first
 * value is always plaintext. Call this once per auth entry point (signup, OAuth callback) to
 * self-heal it into ciphertext — a no-op once it's already encrypted.
 */
export async function ensureDisplayNameEncrypted(userId: string): Promise<void> {
  try {
    const db = createAdminClient();
    const { data } = await db.from("profiles").select("display_name").eq("id", userId).maybeSingle();
    const displayName = data?.display_name;
    if (!displayName || isEncryptedField(displayName)) return;
    await db.from("profiles").update({ display_name: encryptField(displayName) }).eq("id", userId);
  } catch (error) {
    console.error("ensureDisplayNameEncrypted failed", { userId, error });
  }
}
