import { describe, expect, it } from "vitest";
import { sendEmail } from "@/lib/email/send";

describe("sendEmail", () => {
  it("skips without throwing when RESEND_API_KEY isn't configured", async () => {
    const previousKey = process.env.RESEND_API_KEY;
    const previousFrom = process.env.RESEND_FROM_ADDRESS;
    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_FROM_ADDRESS;
    try {
      const result = await sendEmail({ to: "someone@example.com", subject: "Hola", html: "<p>Hola</p>" });
      expect(result).toEqual({ skipped: true });
    } finally {
      if (previousKey !== undefined) process.env.RESEND_API_KEY = previousKey;
      if (previousFrom !== undefined) process.env.RESEND_FROM_ADDRESS = previousFrom;
    }
  });
});
