export function canMutateTransaction(userId: string, createdBy: string) {
  return userId.length > 0 && userId === createdBy;
}

export function isCodeActive(expiresAt: string, usedAt: string | null, now = new Date()) {
  return usedAt === null && new Date(expiresAt).getTime() > now.getTime();
}
