import { DISCOVERY_E2E_FESTIVALS } from "@/features/festivals/discovery-e2e-fixture";
import { mapApprovedScheduleSelections } from "@/features/schedule-email/schedule-email-resolution";

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
  const requests = new Map();
  const repository = {
    findByIdempotencyKey: async (key) => requests.get(key) || null,
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
    markSent: async (id, providerMessageId) => {
      const request = [...requests.values()].find((candidate) => candidate.id === id);
      Object.assign(request, { delivery_status: "sent", provider_message_id: providerMessageId });
      return request;
    },
    markFailed: async (id, failure) => {
      const request = [...requests.values()].find((candidate) => candidate.id === id);
      Object.assign(request, {
        delivery_status: "failed",
        failure_code: failure.code,
        failure_message: failure.message,
      });
      return request;
    },
  };

  return {
    repository,
    provider: { send: async () => ({ success: true, id: "e2e-provider-message" }) },
  };
}
