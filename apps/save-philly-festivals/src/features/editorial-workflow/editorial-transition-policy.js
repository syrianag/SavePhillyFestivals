export const EDITORIAL_ROLES = Object.freeze(["admin", "super_admin"]);

export const FESTIVAL_TRANSITIONS = Object.freeze({
  draft: Object.freeze(["pending_review", "archived"]),
  changes_requested: Object.freeze(["pending_review", "archived"]),
  pending_review: Object.freeze(["changes_requested", "rejected", "approved"]),
  rejected: Object.freeze(["changes_requested", "archived"]),
  approved: Object.freeze(["published", "changes_requested", "archived"]),
  published: Object.freeze(["unpublished", "canceled", "archived"]),
  unpublished: Object.freeze(["published", "changes_requested", "canceled", "archived"]),
  canceled: Object.freeze(["archived"]),
  archived: Object.freeze([]),
});

const INTERNAL_REASON_REQUIRED = new Set(["changes_requested", "rejected", "canceled", "archived"]);
const PRODUCER_MESSAGE_REQUIRED = new Set(["changes_requested", "rejected"]);

export class EditorialPolicyError extends Error {
  constructor(message, code = "invalid_transition") {
    super(message);
    this.name = "EditorialPolicyError";
    this.code = code;
    this.statusCode = 422;
  }
}

export function validTransitions(fromState) {
  return FESTIVAL_TRANSITIONS[fromState] || [];
}

export function assertEditorialTransition({ role, fromState, toState, reason, producerMessage, publicMessage }) {
  if (!EDITORIAL_ROLES.includes(role)) throw new EditorialPolicyError("Editorial role required.", "forbidden");
  if (!validTransitions(fromState).includes(toState)) {
    throw new EditorialPolicyError(`Transition from ${fromState} to ${toState} is not allowed.`);
  }
  if (INTERNAL_REASON_REQUIRED.has(toState) && !reason) {
    throw new EditorialPolicyError("An internal reason is required.", "reason_required");
  }
  if (PRODUCER_MESSAGE_REQUIRED.has(toState) && !producerMessage) {
    throw new EditorialPolicyError("A producer-safe message is required.", "producer_message_required");
  }
  if (publicMessage && toState !== "canceled") {
    throw new EditorialPolicyError("A public message is allowed only for cancellation tombstones.", "public_message_forbidden");
  }
  if (toState === "canceled" && !publicMessage) {
    throw new EditorialPolicyError("A public cancellation message is required.", "public_message_required");
  }
  return true;
}
