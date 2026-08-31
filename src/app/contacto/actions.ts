"use server";
import { sendEmail } from "@/lib/email/send";

export type ContactState = { success?: boolean; error?: string };

const TOPIC_LABELS: Record<string, string> = {
  general: "Consulta general",
  sugerencia: "Sugerencia",
  problema: "Reportar un problema",
  facturacion: "Facturación / suscripción",
  otro: "Otro",
};

const CONTACT_ADDRESS = "hello@miti-miti.com";

export async function sendContactMessage(_state: ContactState, formData: FormData): Promise<ContactState> {
  const topicKey = String(formData.get("topic") ?? "general");
  const email = String(formData.get("email") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (message.length < 10) return { error: "Contanos un poco más — el mensaje es muy corto." };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Revisá el email, no parece válido." };

  const topicLabel = TOPIC_LABELS[topicKey] ?? topicKey;
  const html = `
    <p><b>Tema:</b> ${topicLabel}</p>
    <p><b>Email de contacto:</b> ${email || "no indicado"}</p>
    <p><b>Mensaje:</b></p>
    <p>${message.replace(/\n/g, "<br/>")}</p>
  `;
  const result = await sendEmail({ to: CONTACT_ADDRESS, subject: `Contacto Miti-Miti · ${topicLabel}`, html });
  if (!result.skipped && result.error) {
    return { error: `No pudimos enviar tu mensaje. Escribinos directo a ${CONTACT_ADDRESS}.` };
  }
  return { success: true };
}
