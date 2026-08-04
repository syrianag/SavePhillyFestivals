export const OUTBOX_MAX_ATTEMPTS = 5;
export const OUTBOX_LEASE_MS = 5 * 60 * 1000;
const RETRY_SECONDS = [60, 5 * 60, 30 * 60, 2 * 60 * 60];

export function isClaimable(item, now = new Date()) {
  const pending = item.status === "pending" && new Date(item.next_attempt_at) <= now;
  const expired = item.status === "processing" && item.lease_expires_at && new Date(item.lease_expires_at) <= now;
  return (pending || expired) && item.attempts < item.max_attempts;
}

export function nextFailureState(item, { retryable, errorCode, now = new Date() }) {
  if (item.status !== "processing") throw new Error("invalid_outbox_transition");
  if (!retryable || item.attempts >= item.max_attempts) {
    return { status: "failed", next_attempt_at: now, last_error_code: errorCode };
  }
  const delay = RETRY_SECONDS[Math.min(item.attempts - 1, RETRY_SECONDS.length - 1)];
  return {
    status: "pending",
    next_attempt_at: new Date(now.getTime() + delay * 1000),
    last_error_code: errorCode,
  };
}

export function completedState(item, providerResultId, now = new Date()) {
  if (item.status !== "processing") throw new Error("invalid_outbox_transition");
  return { status: "completed", provider_result_id: providerResultId, completed_at: now };
}
