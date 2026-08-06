import { randomUUID } from "node:crypto";

import { buildScheduleEmailContent } from "@/features/schedule-email/schedule-email-content";

export const SCHEDULE_EMAIL_DELIVERY_LEASE_MS = 5 * 60 * 1000;
export const SCHEDULE_EMAIL_MAX_ATTEMPTS = 3;

const SAFE_FAILURES = Object.freeze({
  provider_unconfigured: "Email delivery is not configured. Your schedule remains saved in this browser.",
  provider_error: "The email provider could not complete delivery. Your schedule remains saved in this browser.",
});

export class IdempotencyConflictError extends Error {
  constructor() {
    super("This idempotency key is already associated with a different submission.");
    this.name = "IdempotencyConflictError";
    this.statusCode = 409;
  }
}

export class NoResolvedScheduleItemsError extends Error {
  constructor() {
    super("None of the selected festivals or events are currently available.");
    this.name = "NoResolvedScheduleItemsError";
    this.statusCode = 422;
  }
}

export function redactedDeliveryFailure(result) {
  const code = result?.code === "provider_unconfigured" ? "provider_unconfigured" : "provider_error";
  return { code, message: SAFE_FAILURES[code] };
}

function matchesSubmission(request, input) {
  if (
    request.recipient_email !== input.email ||
    request.selection_version !== input.selection.version ||
    request.items?.length !== input.selection.items.length
  ) return false;

  return input.selection.items.every((item, index) => {
    const stored = request.items[index];
    return stored.item_type === item.type && stored.item_id === item.id;
  });
}

export function scheduleEmailResponse(request, { replayed = false } = {}) {
  const status = request.delivery_status;
  return {
    request_id: request.id,
    status,
    email_sent: status === "sent",
    replayed,
    unavailable_items: (request.items || [])
      .filter((item) => item.resolution_status === "unavailable")
      .map((item) => ({ type: item.item_type, id: item.item_id })),
    ...(status === "failed" ? { message: request.failure_message || SAFE_FAILURES.provider_error } : {}),
    ...(status === "pending" ? { message: "This schedule email request is still being processed." } : {}),
  };
}

function isUniqueConflict(error) {
  return error?.code === "P2002";
}

async function currentResponse(repository, fallback, replayed) {
  let current = null;
  try { current = await repository.findById?.(fallback.id); } catch { /* retain safe pending state */ }
  return scheduleEmailResponse(current || fallback, { replayed });
}

export async function submitScheduleEmail(input, {
  repository,
  provider,
  siteUrl,
  now = () => new Date(),
  createAttemptToken = randomUUID,
  leaseMs = SCHEDULE_EMAIL_DELIVERY_LEASE_MS,
  maxAttempts = SCHEDULE_EMAIL_MAX_ATTEMPTS,
}) {
  let request = await repository.findByIdempotencyKey(input.idempotency_key);
  let replayed = Boolean(request);
  let resolution;

  if (request) {
    if (!matchesSubmission(request, input)) throw new IdempotencyConflictError();
    if (request.delivery_status === "sent") return scheduleEmailResponse(request, { replayed: true });
  } else {
    resolution = await repository.resolveApproved(input.selection.items);
    if (resolution.resolved.length === 0) throw new NoResolvedScheduleItemsError();
    try {
      request = await repository.createRequest({
        email: input.email,
        idempotencyKey: input.idempotency_key,
        version: input.selection.version,
        items: input.selection.items.map((item, position) => ({
          ...item,
          position,
          resolutionStatus: resolution.resolved.some(
            (resolved) => resolved.type === item.type && resolved.id === item.id
          ) ? "resolved" : "unavailable",
        })),
      });
    } catch (error) {
      if (!isUniqueConflict(error)) throw error;
      request = await repository.findByIdempotencyKey(input.idempotency_key);
      if (!request) throw error;
      if (!matchesSubmission(request, input)) throw new IdempotencyConflictError();
      replayed = true;
      if (request.delivery_status === "sent") return scheduleEmailResponse(request, { replayed: true });
    }
  }

  const attemptedAt = now();
  const attemptToken = createAttemptToken();
  let claimed;
  try {
    claimed = await repository.claimDelivery({
      id: request.id,
      attemptToken,
      attemptedAt,
      staleBefore: new Date(attemptedAt.getTime() - leaseMs),
      maxAttempts,
    });
  } catch {
    return currentResponse(repository, request, replayed);
  }
  if (!claimed) return currentResponse(repository, request, true);

  if (!resolution) resolution = await repository.resolveApproved(input.selection.items);
  if (resolution.resolved.length === 0) {
    const failure = redactedDeliveryFailure({ code: "provider_error" });
    try { await repository.markFailed({ id: claimed.id, attemptToken, failure }); } catch { /* recover through fenced lease */ }
    return currentResponse(repository, claimed, replayed);
  }

  const content = buildScheduleEmailContent({
    resolved: resolution.resolved,
    unavailableCount: resolution.unavailable.length,
    siteUrl,
  });

  let delivery;
  try {
    delivery = await provider.send(
      { to: input.email, ...content },
      { idempotencyKey: `schedule-email/${request.id}` },
    );
  } catch {
    delivery = { success: false, code: "provider_error" };
  }

  if (delivery?.success) {
    try {
      await repository.markSent({
        id: claimed.id,
        attemptToken,
        providerMessageId: delivery.id || null,
        sentAt: now(),
      });
    } catch {
      // The stable provider key makes a retry safe if provider success preceded bookkeeping.
    }
    return currentResponse(repository, claimed, replayed);
  }

  const failure = redactedDeliveryFailure(delivery);
  try { await repository.markFailed({ id: claimed.id, attemptToken, failure }); } catch { /* recover through fenced lease */ }
  return currentResponse(repository, claimed, replayed);
}
