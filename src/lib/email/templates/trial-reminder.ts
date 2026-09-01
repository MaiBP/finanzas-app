import { buildDay20Message, buildDay27Message, buildTrialEndedMessage } from "@/services/trial-reminders";
import { getAppUrl } from "@/lib/env";

const COCOA = "#3b2722";
const GOLD = "#ffca50";
const CREAM = "#f2ebd0";

function wrapEmailHtml(bodyText: string, ctaLabel: string, ctaUrl: string): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:${CREAM};font-family:sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CREAM};padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="100%" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;">
          <tr><td style="background:${COCOA};padding:24px;text-align:center;">
            <span style="color:${GOLD};font-size:20px;font-weight:900;">Miti-Miti</span>
          </td></tr>
          <tr><td style="padding:28px 24px;color:${COCOA};font-size:15px;line-height:1.6;">
            <p style="margin:0 0 20px;">${bodyText}</p>
            <p style="margin:0;text-align:center;">
              <a href="${ctaUrl}" style="display:inline-block;background:${GOLD};color:${COCOA};font-weight:700;text-decoration:none;padding:12px 24px;border-radius:999px;">${ctaLabel}</a>
            </p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

function appUrl(path: string): string {
  return `${getAppUrl()}${path}`;
}

export function day20EmailHtml(transactionCount: number): string {
  return wrapEmailHtml(buildDay20Message(transactionCount), "Ver mi hogar", appUrl("/app"));
}

export function day27EmailHtml(): string {
  return wrapEmailHtml(buildDay27Message(), "Activar suscripción", appUrl("/app/ajustes"));
}

export function trialEndedEmailHtml(): string {
  return wrapEmailHtml(buildTrialEndedMessage(), "Activar suscripción", appUrl("/app/ajustes"));
}
