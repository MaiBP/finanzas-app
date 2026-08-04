import { describe, expect, it } from "vitest";
import { canMutateTransaction, isCodeActive } from "@/lib/permissions/transactions";
import { isValidWebhookSecret } from "@/lib/telegram/security";
import { escapeTelegramHtml } from "@/lib/telegram/api";

describe("permissions",()=>{it("allows editing own transaction",()=>expect(canMutateTransaction("u1","u1")).toBe(true));it("rejects editing another user's transaction",()=>expect(canMutateTransaction("u1","u2")).toBe(false))});
describe("temporary codes",()=>{const now=new Date("2026-08-01T12:00:00Z");it("accepts unused unexpired codes",()=>expect(isCodeActive("2026-08-01T12:10:00Z",null,now)).toBe(true));it("rejects expired or used codes",()=>{expect(isCodeActive("2026-08-01T11:59:00Z",null,now)).toBe(false);expect(isCodeActive("2026-08-01T12:10:00Z","2026-08-01T11:58:00Z",now)).toBe(false)})});
describe("Telegram webhook",()=>{it("validates the exact secret",()=>{expect(isValidWebhookSecret("secret","secret")).toBe(true);expect(isValidWebhookSecret("wrong","secret")).toBe(false);expect(isValidWebhookSecret(null,"secret")).toBe(false)});it("escapes dynamic HTML",()=>expect(escapeTelegramHtml('<Cuenta & "Casa">')).toBe("&lt;Cuenta &amp; &quot;Casa&quot;&gt;"))});
