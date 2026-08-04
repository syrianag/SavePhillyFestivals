import { describe, expect, it, vi } from "vitest";

import { authorizeProducer, ProducerAuthenticationError, ProducerAuthorizationError } from "@/features/producer-submission/producer-authorization";
import { ProducerFestivalIncompleteError } from "@/features/producer-submission/producer-submission-errors";
import { createProducerDraftSchema, isExplicitNewYorkDateTime, patchProducerFestivalSchema, submitProducerFestivalSchema } from "@/features/producer-submission/producer-submission-schema";
import { createOwnedDraft, patchOwnedFestival, submitOwnedFestival } from "@/features/producer-submission/producer-submission-service";

const user = { id: "efce8c4b-ee6e-4da9-8fdd-54f187938a45", email: "account@example.com", role: "producer" };
const submissionKey = "4319a9ca-3c0b-4aa1-8a72-65ba7a55d115";
const completeFestival = {
  id: "8fe0c269-81d1-412c-a3c4-a73c940f8f36", name: "Philadelphia <Arts> Festival",
  description: "A complete description for this Philadelphia festival.", location: "Penn's Landing",
  city: "Philadelphia", state: "PA", zip_code: "19106", contact_name: "Festival Producer",
  contact_email: "contact@example.com", calendar_date_type: "timed", time_zone: "America/New_York",
  start_date: new Date("2026-09-10T14:00:00-04:00"), end_date: new Date("2026-09-10T20:00:00-04:00"),
  all_day_start: null, all_day_end: null,
};

function authDependencies(overrides = {}) {
  return {
    getSession: vi.fn(async () => ({ user: { id: user.id, role: "public" } })),
    userRepository: { findCurrentUser: vi.fn(async () => ({ ...user, email_verified: new Date() })) },
    ...overrides,
  };
}

function notificationRepository({ incomplete = false, replayed = false } = {}) {
  const records = new Map();
  return {
    submitOwned: vi.fn(async (data) => {
      data.assertComplete(incomplete ? { ...completeFestival, description: "" } : completeFestival);
      const festival = { ...completeFestival, status: "pending", workflow_state: "pending_review", revision: 3 };
      if (!records.size) {
        records.set("producer_receipt", { id: "receipt-id", notification_type: "producer_receipt", recipient_email: completeFestival.contact_email, delivery_status: "pending" });
        records.set("team_notification", { id: "team-id", notification_type: "team_notification", recipient_alias: "PRODUCER_SUBMISSION_TEAM_ALIAS", delivery_status: "pending" });
      }
      return { festival, replayed };
    }),
    claimSubmissionNotification: vi.fn(async ({ notificationType, attemptToken }) => {
      const record = records.get(notificationType);
      if (!record || record.delivery_status === "sent" || record.attemptToken) return null;
      Object.assign(record, { attemptToken, delivery_status: "pending" });
      return { ...record };
    }),
    markSubmissionNotificationSent: vi.fn(async ({ notificationId, attemptToken, providerMessageId }) => {
      const record = [...records.values()].find((item) => item.id === notificationId && item.attemptToken === attemptToken);
      Object.assign(record, { delivery_status: "sent", provider_message_id: providerMessageId, attemptToken: null });
    }),
    markSubmissionNotificationFailed: vi.fn(async ({ notificationId, attemptToken, failureCode }) => {
      const record = [...records.values()].find((item) => item.id === notificationId && item.attemptToken === attemptToken);
      Object.assign(record, { delivery_status: "failed", failure_code: failureCode, attemptToken: null });
    }),
    records,
  };
}

const submitInput = { expected_revision: 2, representation_acknowledged: true, accuracy_acknowledged: true, terms_acknowledged: true, terms_version: 1 };

describe("verified producer authorization", () => {
  it("reloads the database user and accepts only verified producer-capable roles", async () => {
    for (const role of ["producer", "admin", "super_admin"]) {
      const dependencies = authDependencies({ userRepository: { findCurrentUser: vi.fn(async () => ({ ...user, role, email_verified: new Date() })) } });
      await expect(authorizeProducer(dependencies)).resolves.toMatchObject({ id: user.id, role });
      expect(dependencies.userRepository.findCurrentUser).toHaveBeenCalledWith(user.id);
    }
  });
  it("fails for missing/deleted, unverified, and public users", async () => {
    await expect(authorizeProducer(authDependencies({ getSession: vi.fn(async () => null) }))).rejects.toBeInstanceOf(ProducerAuthenticationError);
    await expect(authorizeProducer(authDependencies({ userRepository: { findCurrentUser: vi.fn(async () => null) } }))).rejects.toBeInstanceOf(ProducerAuthenticationError);
    await expect(authorizeProducer(authDependencies({ userRepository: { findCurrentUser: vi.fn(async () => ({ ...user, email_verified: null })) } }))).rejects.toBeInstanceOf(ProducerAuthorizationError);
    await expect(authorizeProducer(authDependencies({ userRepository: { findCurrentUser: vi.fn(async () => ({ ...user, role: "public", email_verified: new Date() })) } }))).rejects.toBeInstanceOf(ProducerAuthorizationError);
  });
});

describe("strict producer submission schemas", () => {
  it("rejects client-owned workflow/owner/audit fields", () => {
    expect(createProducerDraftSchema.safeParse({ submission_key: submissionKey }).success).toBe(true);
    expect(createProducerDraftSchema.safeParse({ submission_key: submissionKey, owner_user_id: user.id }).success).toBe(false);
    expect(patchProducerFestivalSchema.safeParse({ expected_revision: 0, workflow_state: "approved" }).success).toBe(false);
    expect(patchProducerFestivalSchema.safeParse({ expected_revision: 0, status: "approved" }).success).toBe(false);
    expect(submitProducerFestivalSchema.safeParse(submitInput).success).toBe(true);
  });
  it("requires correct New York offsets and rejects both ambiguous fallback instants", () => {
    expect(isExplicitNewYorkDateTime("2026-08-04T12:00:00-04:00")).toBe(true);
    expect(isExplicitNewYorkDateTime("2026-12-04T12:00:00-05:00")).toBe(true);
    expect(isExplicitNewYorkDateTime("2026-11-01T01:30:00-04:00")).toBe(false);
    expect(isExplicitNewYorkDateTime("2026-11-01T01:30:00-05:00")).toBe(false);
  });
});

describe("draft, revision, and submission service contracts", () => {
  it("creates a server-identified draft and replays an owner-scoped key", async () => {
    const repository = { findOwnedBySubmissionKey: vi.fn().mockResolvedValueOnce(null), createOwnedDraft: vi.fn(async (data) => ({ id: data.id, workflow_state: "draft", revision: 0 })) };
    const created = await createOwnedDraft({ submission_key: submissionKey }, { repository, user, createId: () => completeFestival.id });
    expect(created.replayed).toBe(false);
    expect(repository.createOwnedDraft).toHaveBeenCalledWith(expect.objectContaining({ ownerUserId: user.id, submissionKey }));
  });
  it("passes owner/revision on patch and converts F-06 dates", async () => {
    const repository = { updateOwnedEditable: vi.fn(async (data) => data) };
    const result = await patchOwnedFestival(completeFestival.id, { expected_revision: 4, calendar_date_type: "timed", start_date: "2026-08-04T12:00:00-04:00", end_date: "2026-08-04T14:00:00-04:00" }, { repository, user });
    expect(result).toMatchObject({ ownerUserId: user.id, expectedRevision: 4 });
    expect(result.data.start_date).toBeInstanceOf(Date);
  });
  it("attempts both providers after persistence, targets contact email/team env alias, and escapes HTML", async () => {
    const repository = notificationRepository();
    const provider = { send: vi.fn(async () => ({ success: true, id: "provider-id" })) };
    const result = await submitOwnedFestival(completeFestival.id, submitInput, { repository, user, notificationProvider: provider, teamRecipientAddress: "team@example.com", createAttemptToken: (() => { let i = 0; return () => `attempt-${++i}`; })() });
    expect(result.festival).toMatchObject({ status: "pending", workflow_state: "pending_review" });
    expect(repository.submitOwned).toHaveBeenCalledWith(expect.objectContaining({ teamRecipientAlias: "PRODUCER_SUBMISSION_TEAM_ALIAS" }));
    expect(provider.send).toHaveBeenCalledTimes(2);
    expect(provider.send.mock.calls[0][0]).toMatchObject({ to: "contact@example.com" });
    expect(provider.send.mock.calls[1][0]).toMatchObject({ to: "team@example.com" });
    expect(provider.send.mock.calls[0][0].html).toContain("Philadelphia &lt;Arts&gt; Festival");
    expect(repository.markSubmissionNotificationSent).toHaveBeenCalledTimes(2);
  });
  it("does not duplicate already-sent deliveries on replay", async () => {
    const repository = notificationRepository({ replayed: true });
    const provider = { send: vi.fn(async () => ({ success: true, id: "provider-id" })) };
    await submitOwnedFestival(completeFestival.id, submitInput, { repository, user, notificationProvider: provider, teamRecipientAddress: "team@example.com" });
    await submitOwnedFestival(completeFestival.id, submitInput, { repository, user, notificationProvider: provider, teamRecipientAddress: "team@example.com" });
    expect(provider.send).toHaveBeenCalledTimes(2);
  });
  it("records truthful provider failures without rejecting pending review", async () => {
    const repository = notificationRepository();
    const result = await submitOwnedFestival(completeFestival.id, submitInput, { repository, user, notificationProvider: null, teamRecipientAddress: "" });
    expect(result.festival.workflow_state).toBe("pending_review");
    expect(repository.markSubmissionNotificationFailed).toHaveBeenCalledTimes(2);
    expect(repository.markSubmissionNotificationFailed).toHaveBeenCalledWith(expect.objectContaining({ failureCode: "provider_unconfigured" }));
  });
  it("rejects incomplete festivals before notification attempts", async () => {
    const repository = notificationRepository({ incomplete: true });
    await expect(submitOwnedFestival(completeFestival.id, submitInput, { repository, user })).rejects.toBeInstanceOf(ProducerFestivalIncompleteError);
    expect(repository.claimSubmissionNotification).not.toHaveBeenCalled();
  });
});
