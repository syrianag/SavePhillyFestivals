import { buildScheduleEmailContent } from "@/features/schedule-email/schedule-email-content";

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

export async function submitScheduleEmail(input, { repository, provider, siteUrl }) {
  const existing = await repository.findByIdempotencyKey(input.idempotency_key);
  if (existing) {
    if (!matchesSubmission(existing, input)) throw new IdempotencyConflictError();
    return scheduleEmailResponse(existing, { replayed: true });
  }

  const resolution = await repository.resolveApproved(input.selection.items);
  if (resolution.resolved.length === 0) throw new NoResolvedScheduleItemsError();

  let request;
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
    const racedRequest = await repository.findByIdempotencyKey(input.idempotency_key);
    if (!racedRequest) throw error;
    if (!matchesSubmission(racedRequest, input)) throw new IdempotencyConflictError();
    return scheduleEmailResponse(racedRequest, { replayed: true });
  }

  const content = buildScheduleEmailContent({
    resolved: resolution.resolved,
    unavailableCount: resolution.unavailable.length,
    siteUrl,
  });

  let delivery;
  try {
    delivery = await provider.send({ to: input.email, ...content });
  } catch {
    delivery = { success: false, code: "provider_error" };
  }

  if (delivery?.success) {
    const sent = await repository.markSent(request.id, delivery.id || null);
    return scheduleEmailResponse(sent);
  }

  const failure = redactedDeliveryFailure(delivery);
  const failed = await repository.markFailed(request.id, failure);
  return scheduleEmailResponse(failed);
}
