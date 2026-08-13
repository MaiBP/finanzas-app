export type HouseholdMember = { userId: string; displayName: string | null };

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function redactHouseholdNames(text: string, members: HouseholdMember[], selfUserId: string): { text: string; mentioned: boolean } {
  let result = text;
  let mentioned = false;
  for (const member of members) {
    const name = member.displayName?.trim();
    if (!name) continue;
    const label = member.userId === selfUserId ? "tú" : "tu pareja";
    const pattern = new RegExp(`\\b${escapeRegExp(name)}\\b`, "giu");
    if (pattern.test(result)) mentioned = true;
    result = result.replace(pattern, label);
  }
  return { text: result, mentioned };
}

export function redactRecentMessages<T extends { content: string }>(
  messages: T[],
  members: HouseholdMember[],
  selfUserId: string,
): { messages: T[]; mentioned: boolean } {
  let mentioned = false;
  const redacted = messages.map((message) => {
    const result = redactHouseholdNames(message.content, members, selfUserId);
    if (result.mentioned) mentioned = true;
    return { ...message, content: result.text };
  });
  return { messages: redacted, mentioned };
}

export const HOUSEHOLD_NAME_PRIVACY_NOTE = "🔒 Por privacidad no uso nombres propios; hablo en importes y en términos de «tú»/«tu pareja».";
