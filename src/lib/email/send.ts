import { getResendClient } from "@/lib/email/client";

export type SendEmailResult = { skipped: true } | { skipped: false; error?: string };

export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }): Promise<SendEmailResult> {
  const resend = getResendClient();
  const from = process.env.RESEND_FROM_ADDRESS;
  if (!resend || !from) {
    console.warn("sendEmail: RESEND_API_KEY/RESEND_FROM_ADDRESS not configured, skipping", { to, subject });
    return { skipped: true };
  }
  const { error } = await resend.emails.send({ from, to, subject, html });
  if (error) return { skipped: false, error: error.message };
  return { skipped: false };
}
