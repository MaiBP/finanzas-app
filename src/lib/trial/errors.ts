// Every RPC gated by household_is_writable (see migration 202608280001_trial_subscription.sql)
// raises its exception with this prefix, so the app layer can recognize "blocked by a finished
// trial" without matching on brittle exact Spanish wording.
const READ_ONLY_TRIAL_PREFIX = "READ_ONLY_TRIAL:";

export function isReadOnlyTrialError(message: string): boolean {
  return message.startsWith(READ_ONLY_TRIAL_PREFIX);
}

// Strips the technical prefix so the RPC's own Spanish message can be shown to the user as-is.
export function friendlyRpcError(message: string): string {
  return isReadOnlyTrialError(message) ? message.slice(READ_ONLY_TRIAL_PREFIX.length).trim() : message;
}
