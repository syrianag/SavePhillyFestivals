import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ transaction: vi.fn() }));

vi.mock("@/lib/db", () => ({ prisma: { $transaction: mocks.transaction } }));

import { producerAccessRepository } from "@/features/producer-access/producer-access-repository";

/**
 * Guards the database's audit contract for approving a combined producer application.
 *
 * `validate_festival_audit_at_commit` rejects the festival insert outright unless the same
 * transaction also writes a matching `FestivalTransition` and — because the festival has an
 * owner and the actor is an admin — exactly one producer-audience `FestivalWorkflowNotification`.
 * Those writes are enforced by triggers, not convention, so a refactor that drops one turns
 * approval into a 500 in production. This test fails loudly instead.
 */
function transactionClient(overrides = {}) {
  const client = {
    producerAccessRequest: {
      findUnique: vi.fn().mockResolvedValue({
        id: "req-1",
        status: "pending",
        user_id: "user-1",
        festival_id: null,
        proposed_festival: {
          name: "Odunde Festival",
          slug: "odunde-festival-abcd1234",
          contact_email: "ama@example.com",
          start_date: "2026-09-01T00:00:00.000Z",
          acknowledged_at: "2026-08-12T00:00:00.000Z",
        },
        ...overrides.request,
      }),
      update: vi.fn().mockResolvedValue({ id: "req-1", status: "approved" }),
    },
    user: {
      findUnique: vi.fn().mockResolvedValue({ id: "user-1", role: "public", status: "active", revision: 0 }),
      update: vi.fn().mockResolvedValue({}),
    },
    userAccountTransition: { create: vi.fn().mockResolvedValue({}) },
    festival: { create: vi.fn().mockResolvedValue({ id: "fest-1", workflow_state: "pending_review", revision: 0 }) },
    festivalTransition: { create: vi.fn().mockResolvedValue({ id: "trans-1" }) },
    festivalRevision: { create: vi.fn().mockResolvedValue({}) },
    festivalWorkflowNotification: { create: vi.fn().mockResolvedValue({}) },
  };
  return client;
}

describe("approving a combined producer application", () => {
  let client;

  beforeEach(() => {
    client = transactionClient();
    mocks.transaction.mockImplementation((callback) => callback(client));
  });

  it("grants the producer role", async () => {
    await producerAccessRepository.decideRequest({ requestId: "req-1", decision: "approved", reason: null, actorUserId: "admin-1" });

    expect(client.user.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ role: "producer" }),
    }));
  });

  it("creates the festival owned by the applicant, in the review queue", async () => {
    await producerAccessRepository.decideRequest({ requestId: "req-1", decision: "approved", reason: null, actorUserId: "admin-1" });

    const { data } = client.festival.create.mock.calls[0][0];
    expect(data.name).toBe("Odunde Festival");
    expect(data.slug).toBe("odunde-festival-abcd1234");
    expect(data.owner_user_id).toBe("user-1");
    expect(data.workflow_state).toBe("pending_review");
    /* The insert trigger rejects any initial revision other than zero. */
    expect(data.revision).toBe(0);
    /* Stored as an ISO string in JSON; the column is a timestamp. */
    expect(data.start_date).toBeInstanceOf(Date);
  });

  /* Each of these three is separately trigger-enforced. */
  it("writes the transition, revision snapshot, and producer notification the triggers require", async () => {
    await producerAccessRepository.decideRequest({ requestId: "req-1", decision: "approved", reason: null, actorUserId: "admin-1" });

    const transition = client.festivalTransition.create.mock.calls[0][0].data;
    expect(transition).toMatchObject({ actor_user_id: "admin-1", from_state: null, to_state: "pending_review", revision: 0 });

    expect(client.festivalRevision.create).toHaveBeenCalledTimes(1);
    expect(client.festivalRevision.create.mock.calls[0][0].data).toMatchObject({ workflow_revision: 0, transition_id: "trans-1" });

    expect(client.festivalWorkflowNotification.create).toHaveBeenCalledTimes(1);
    expect(client.festivalWorkflowNotification.create.mock.calls[0][0].data).toMatchObject({ workflow_revision: 0, recipient_email: "ama@example.com" });
  });

  /* The admin must be the transition actor: the database only accepts a festival insert whose
   * actor is an owning producer or an admin, and the applicant is neither at insert time. */
  it("records the deciding admin as the festival actor, not the applicant", async () => {
    await producerAccessRepository.decideRequest({ requestId: "req-1", decision: "approved", reason: null, actorUserId: "admin-1" });

    expect(client.festivalTransition.create.mock.calls[0][0].data.actor_user_id).toBe("admin-1");
    expect(client.festivalRevision.create.mock.calls[0][0].data.actor_user_id).toBe("admin-1");
  });

  it("links the created festival back to the request", async () => {
    await producerAccessRepository.decideRequest({ requestId: "req-1", decision: "approved", reason: null, actorUserId: "admin-1" });

    expect(client.producerAccessRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { festival_id: expect.any(String) } }),
    );
  });

  /* Re-deciding must never mint a second festival for the same application. */
  it("does not create a festival when one already exists", async () => {
    client = transactionClient({ request: { festival_id: "fest-existing" } });
    mocks.transaction.mockImplementation((callback) => callback(client));

    await producerAccessRepository.decideRequest({ requestId: "req-1", decision: "approved", reason: null, actorUserId: "admin-1" });

    expect(client.festival.create).not.toHaveBeenCalled();
  });

  it("creates no festival when the application is rejected", async () => {
    await producerAccessRepository.decideRequest({ requestId: "req-1", decision: "rejected", reason: "Out of scope", actorUserId: "admin-1" });

    expect(client.festival.create).not.toHaveBeenCalled();
    expect(client.user.update).not.toHaveBeenCalled();
  });

  /* A two-step request carries no proposed event, so approval grants the role and stops. */
  it("creates no festival for a request with no proposed event", async () => {
    client = transactionClient({ request: { proposed_festival: null } });
    mocks.transaction.mockImplementation((callback) => callback(client));

    await producerAccessRepository.decideRequest({ requestId: "req-1", decision: "approved", reason: null, actorUserId: "admin-1" });

    expect(client.festival.create).not.toHaveBeenCalled();
    expect(client.user.update).toHaveBeenCalled();
  });
});
