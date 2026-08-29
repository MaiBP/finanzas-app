export type NotificationKey = "day20" | "day27" | "trial_ended";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function daysSinceTrialStart(trialStartedAt: Date, now: Date): number {
  return Math.floor((now.getTime() - trialStartedAt.getTime()) / MS_PER_DAY);
}

/** Pure day → notification-key mapping. Day 30+ still counts as trial_ended even if the cron
 * missed running exactly on day 30 (e.g. it was down that day), as long as the household hasn't
 * since become active. */
export function notificationKeyForDay(daysSinceStart: number, subscriptionStatus: string): NotificationKey | null {
  if (subscriptionStatus !== "trialing") return null;
  if (daysSinceStart === 20) return "day20";
  if (daysSinceStart === 27) return "day27";
  if (daysSinceStart >= 30) return "trial_ended";
  return null;
}

export function buildDay20Message(transactionCount: number): string {
  return `📅 Ya llevás 20 días con Miti-Miti y registraste ${transactionCount} ${transactionCount === 1 ? "movimiento" : "movimientos"}. Tu prueba gratuita termina en 10 días.`;
}

export function buildDay27Message(): string {
  return "⏳ Tu prueba termina en 3 días. Activá tu suscripción para no interrumpir el servicio.";
}

export function buildTrialEndedMessage(): string {
  return "🔒 Tu prueba terminó y tu hogar está en modo solo lectura: podés ver todo tu historial, pero no registrar movimientos nuevos ni usar a Finzy. Activá tu suscripción por 4,99 €/mes para seguir sin restricciones.";
}

export function buildReminderMessage(key: NotificationKey, transactionCount: number): string {
  if (key === "day20") return buildDay20Message(transactionCount);
  if (key === "day27") return buildDay27Message();
  return buildTrialEndedMessage();
}
