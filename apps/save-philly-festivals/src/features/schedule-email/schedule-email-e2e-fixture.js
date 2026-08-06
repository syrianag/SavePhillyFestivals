import { DISCOVERY_E2E_FESTIVALS } from "@/features/festivals/discovery-e2e-fixture";
import { mapApprovedScheduleSelections } from "@/features/schedule-email/schedule-email-resolution";

const requests = new Map();
const providerAttempts = new Map();
const providerResults = new Map();

function requestById(id) {
  return [...requests.values()].find((candidate) => candidate.id === id) || null;
}

export function getScheduleEmailE2eDependencies() {
  if (process.env.DISCOVERY_E2E_FIXTURE !== "1") return null;

  const detail = DISCOVERY_E2E_FESTIVALS[0];
  const events = [
    {
      id: "fixture-program-1",
      title: "Community Arts Parade",
      location: "Riverfront Promenade",
      start_time: new Date("2026-09-12T16:00:00.000Z"),
      end_time: new Date("2026-09-12T17:00:00.000Z"),
      festival: { id: detail.id, name: detail.name, slug: detail.slug },
    },
  ];
  const repository = {
    findByIdempotencyKey: async (key) => requests.get(key) || null,
    findById: async (id) => requestById(id),
    resolveApproved: async (items) => mapApprovedScheduleSelections(items, {
      festivals: DISCOVERY_E2E_FESTIVALS,
      events,
    }),
    createRequest: async ({ email, idempotencyKey, version, items }) => {
      const request = {
        id: `e2e-${idempotencyKey}`,
        recipient_email: email,
        idempotency_key: idempotencyKey,
        selection_version: version,
        delivery_status: "pending",
        attempts: 0,
        attempt_token: null,
        attempt_started_at: null,
        items: items.map((item) => ({
          item_type: item.type,
          item_id: item.id,
          resolution_status: item.resolutionStatus,
          position: item.position,
        })),
      };
      requests.set(idempotencyKey, request);
      return request;
    },
    claimDelivery: async ({ id, attemptToken, attemptedAt, staleBefore, maxAttempts }) => {
      const request = requestById(id);
      if (!request || request.delivery_status === "sent") return null;
      const activeLease = request.attempt_token && request.attempt_started_at >= staleBefore;
      if (activeLease) return null;
      if (request.attempts >= maxAttempts) {
        Object.assign(request, {
          delivery_status: "failed",
          failure_code: "retry_exhausted",
          failure_message: "Email delivery could not be completed after several attempts. Your schedule remains saved in this browser.",
          attempt_token: null,
          attempt_started_at: null,
        });
        return null;
      }
      Object.assign(request, {
        delivery_status: "pending",
        attempts: request.attempts + 1,
        attempt_token: attemptToken,
        attempt_started_at: attemptedAt,
        attempted_at: attemptedAt,
        failure_code: null,
        failure_message: null,
      });
      return request;
    },
    markSent: async ({ id, attemptToken, providerMessageId, sentAt }) => {
      const request = requestById(id);
      if (!request || request.delivery_status !== "pending" || request.attempt_token !== attemptToken) return { count: 0 };
      Object.assign(request, {
        delivery_status: "sent",
        provider_message_id: providerMessageId,
        failure_code: null,
        failure_message: null,
        sent_at: sentAt,
        attempt_token: null,
        attempt_started_at: null,
      });
      return { count: 1 };
    },
    markFailed: async ({ id, attemptToken, failure }) => {
      const request = requestById(id);
      if (!request || request.delivery_status !== "pending" || request.attempt_token !== attemptToken) return { count: 0 };
      Object.assign(request, {
        delivery_status: "failed",
        failure_code: failure.code,
        failure_message: failure.message,
        attempt_token: null,
        attempt_started_at: null,
      });
      return { count: 1 };
    },
  };

  return {
    repository,
    provider: {
      async send(message, { idempotencyKey } = {}) {
        if (providerResults.has(idempotencyKey)) return providerResults.get(idempotencyKey);
        const attempts = (providerAttempts.get(idempotencyKey) || 0) + 1;
        providerAttempts.set(idempotencyKey, attempts);
        if (message.to === "fail-once@example.com" && attempts === 1) {
          return { success: false, code: "provider_error" };
        }
        const result = { success: true, id: `e2e-provider-message-${attempts}` };
        providerResults.set(idempotencyKey, result);
        return result;
      },
    },
  };
}
