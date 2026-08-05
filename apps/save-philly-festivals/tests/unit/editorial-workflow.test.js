import { describe, expect, it, vi } from "vitest";

import { authorizeEditor } from "../../src/features/editorial-workflow/editorial-authorization";
import { buildWorkflowNotification, deliverWorkflowNotification } from "../../src/features/editorial-workflow/editorial-notifications";
import { FESTIVAL_TRANSITIONS, assertEditorialTransition, validTransitions } from "../../src/features/editorial-workflow/editorial-transition-policy";
import { transitionFestivalSchema } from "../../src/features/editorial-workflow/editorial-schema";
import { isPublicAssetEligible } from "../../src/features/editorial-workflow/public-assets";
import { PUBLICATION_STATES, isCalendarSelectionAvailable, isPublicDetailAvailable, isPublicSelectionAvailable, isPubliclyDiscoverable } from "../../src/features/editorial-workflow/publication-policy";
import { retryWorkflowNotification, transitionFestival } from "../../src/features/editorial-workflow/editorial-service";
import { isAssetReviewPermitted } from "../../src/features/editorial-workflow/editorial-repository";
import { buildFestivalRevisionSnapshot, FESTIVAL_REVISION_SNAPSHOT_FIELDS } from "../../src/features/editorial-workflow/festival-revision-snapshot";

const allEdges = new Set(Object.entries(FESTIVAL_TRANSITIONS).flatMap(([from, targets]) => targets.map((to) => `${from}:${to}`)));
const messagesFor = (toState) => ({
  reason: ["changes_requested", "rejected", "canceled", "archived"].includes(toState) ? "Private operational reason" : undefined,
  producerMessage: ["changes_requested", "rejected"].includes(toState) ? "Safe owner feedback" : undefined,
  publicMessage: toState === "canceled" ? "Canceled due to weather." : undefined,
});

describe("F-08 transition policy", () => {
  it("matches the approved transition table exactly", () => {
    expect(FESTIVAL_TRANSITIONS).toEqual({
      draft: ["pending_review", "archived"], changes_requested: ["pending_review", "archived"],
      pending_review: ["changes_requested", "rejected", "approved"], rejected: ["changes_requested", "archived"],
      approved: ["published", "changes_requested", "archived"], published: ["unpublished", "canceled", "archived"],
      unpublished: ["published", "changes_requested", "canceled", "archived"], canceled: ["archived"], archived: [],
    });
    for (const fromState of PUBLICATION_STATES) for (const toState of PUBLICATION_STATES) {
      const input = { role: "admin", fromState, toState, ...messagesFor(toState) };
      if (allEdges.has(`${fromState}:${toState}`)) expect(() => assertEditorialTransition(input)).not.toThrow();
      else expect(() => assertEditorialTransition(input)).toThrow(/not allowed/);
    }
  });

  it.each(["admin", "super_admin"])("allows editorial role %s", (role) => {
    expect(() => assertEditorialTransition({ role, fromState: "pending_review", toState: "approved" })).not.toThrow();
  });

  it.each(["public", "producer", "ADMIN", undefined])("rejects non-editor role %s", (role) => {
    expect(() => assertEditorialTransition({ role, fromState: "pending_review", toState: "approved" })).toThrow(/role/);
  });

  it("enforces private, producer-safe, and public message rules", () => {
    expect(() => assertEditorialTransition({ role: "admin", fromState: "pending_review", toState: "changes_requested", reason: "private" })).toThrow(/producer-safe/);
    expect(() => assertEditorialTransition({ role: "admin", fromState: "published", toState: "canceled", reason: "private" })).toThrow(/public cancellation/);
    expect(() => assertEditorialTransition({ role: "admin", fromState: "pending_review", toState: "approved", publicMessage: "leak" })).toThrow(/only for cancellation/);
  });

  it("requires exact strict transition JSON", () => {
    expect(transitionFestivalSchema.safeParse({ expected_revision: 2, to_state: "approved" }).success).toBe(true);
    expect(transitionFestivalSchema.safeParse({ expected_revision: 2, to_state: "approved", status: "published" }).success).toBe(false);
    expect(transitionFestivalSchema.safeParse({ to_state: "approved" }).success).toBe(false);
    expect(transitionFestivalSchema.safeParse({ expected_revision: -1, to_state: "approved" }).success).toBe(false);
  });
});

describe("authoritative publication policy", () => {
  it.each(PUBLICATION_STATES)("keeps predicates correct for %s", (workflow_state) => {
    const record = { workflow_state, first_published_at: workflow_state === "canceled" ? new Date() : null };
    expect(isPubliclyDiscoverable(record)).toBe(workflow_state === "published");
    expect(isPublicSelectionAvailable(record)).toBe(workflow_state === "published");
    expect(isPublicDetailAvailable(record)).toBe(["published", "canceled"].includes(workflow_state));
    expect(isCalendarSelectionAvailable(record)).toBe(["published", "canceled"].includes(workflow_state));
  });
  it("keeps an approved festival private and requires cancellation publication evidence", () => {
    expect(isPublicDetailAvailable({ workflow_state: "approved" })).toBe(false);
    expect(isPublicDetailAvailable({ workflow_state: "canceled", first_published_at: null })).toBe(false);
  });
});

describe("authorization, transition service, and durable delivery", () => {
  it("reloads the current DB role instead of trusting the session role", async () => {
    const userRepository = { findCurrentUser: vi.fn().mockResolvedValue({ id: "u1", email: "a@example.test", role: "producer" }) };
    await expect(authorizeEditor({ getSession: async () => ({ user: { id: "u1", role: "admin" } }), userRepository })).rejects.toMatchObject({ statusCode: 403 });
    expect(userRepository.findCurrentUser).toHaveBeenCalledWith("u1");
  });

  it("passes expected state+revision once and delivers only after transition persistence", async () => {
    const order = [];
    const repository = {
      findForTransition: vi.fn().mockResolvedValue({ id: "f1", name: "Fest", contact_email: "owner@example.test", workflow_state: "pending_review", revision: 4 }),
      transition: vi.fn(async () => { order.push("transition"); return { id: "f1", name: "Fest", contact_email: "owner@example.test", workflow_state: "approved", revision: 5 }; }),
      claimNotification: vi.fn(async () => { order.push("claim"); return { id: "n1", recipient_email: "owner@example.test" }; }),
      markNotificationSent: vi.fn(), markNotificationFailed: vi.fn(),
    };
    const result = await transitionFestival("f1", { expected_revision: 4, to_state: "approved" }, { repository, user: { id: "a1", role: "admin" }, notificationProvider: { send: vi.fn().mockResolvedValue({ success: true, id: "m1" }) }, createAttemptToken: () => "token" });
    expect(order).toEqual(["transition", "claim"]);
    expect(repository.transition).toHaveBeenCalledTimes(1);
    expect(repository.transition).toHaveBeenCalledWith(expect.objectContaining({ festivalId: "f1", expectedRevision: 4, fromState: "pending_review", toState: "approved", actorUserId: "a1" }));
    expect(repository.markNotificationSent).toHaveBeenCalledTimes(1);
    expect(result.festival.workflow_state).toBe("approved");
  });

  it("records provider failure without reversing the completed transition", async () => {
    const repository = { claimNotification: vi.fn().mockResolvedValue({ id: "n1", attempts: 1, recipient_email: "owner@example.test" }), markNotificationSent: vi.fn(), markNotificationFailed: vi.fn() };
    await expect(deliverWorkflowNotification({ festival: { id: "f1", revision: 2, name: "Fest", contact_email: "owner@example.test" }, transition: { toState: "rejected", producerMessage: "No" } }, { repository, provider: { send: vi.fn().mockRejectedValue(new Error("offline")) }, createAttemptToken: () => "token" })).resolves.toMatchObject({ attempted: true, sent: false, delivery_status: "failed", retry_needed: true });
    expect(repository.markNotificationFailed).toHaveBeenCalledWith(expect.objectContaining({ failureCode: "provider_error" }));
  });

  it("recovers safely after provider success when durable bookkeeping crashes", async () => {
    const provider = { send: vi.fn().mockResolvedValue({ success: true, id: "provider-1" }) };
    const repository = {
      claimNotification: vi.fn().mockResolvedValueOnce({ id: "n1", attempts: 1, recipient_email: "owner@example.test" }).mockResolvedValueOnce({ id: "n1", attempts: 2, recipient_email: "owner@example.test" }),
      markNotificationSent: vi.fn().mockRejectedValueOnce(new Error("db unavailable")).mockResolvedValueOnce({ count: 1 }),
    };
    const result = { festival: { id: "f1", revision: 2, name: "Fest", contact_email: "owner@example.test" }, transition: { toState: "approved" } };
    await expect(deliverWorkflowNotification(result, { repository, provider, createAttemptToken: () => "token-1" })).resolves.toMatchObject({ sent: false, retry_needed: true });
    await expect(deliverWorkflowNotification(result, { repository, provider, createAttemptToken: () => "token-2" })).resolves.toMatchObject({ sent: true, delivery_status: "sent" });
    expect(provider.send.mock.calls.map((call) => call[1].idempotencyKey)).toEqual(["festival-workflow/n1", "festival-workflow/n1"]);
  });

  it("keeps a failed retry durably failed and retryable below the bound", async () => {
    const repository = { claimNotification: vi.fn().mockResolvedValue({ id: "n1", attempts: 2, recipient_email: "owner@example.test" }), markNotificationFailed: vi.fn().mockResolvedValue({ count: 1 }) };
    const delivery = await deliverWorkflowNotification({ festival: { id: "f1", revision: 2, name: "Fest", contact_email: "owner@example.test" }, transition: { toState: "rejected", producerMessage: "No" } }, { repository, provider: { send: vi.fn().mockRejectedValue(new Error("offline")) } });
    expect(delivery).toMatchObject({ delivery_status: "failed", retry_needed: true });
    expect(repository.markNotificationFailed).toHaveBeenCalledWith(expect.objectContaining({ failureCode: "provider_error" }));
  });

  it("passes an expired lease cutoff and maximum attempt bound to the atomic claim", async () => {
    const attemptedAt = new Date("2026-08-04T12:10:00.000Z");
    const repository = { claimNotification: vi.fn().mockResolvedValue(null), findNotificationStatus: vi.fn().mockResolvedValue({ delivery_status: "failed", attempts: 5 }) };
    await deliverWorkflowNotification({ festival: { id: "f1", revision: 2 }, transition: { toState: "approved" } }, { repository, now: () => attemptedAt, createAttemptToken: () => "token" });
    expect(repository.claimNotification).toHaveBeenCalledWith(expect.objectContaining({ staleBefore: new Date("2026-08-04T12:05:00.000Z"), maxAttempts: 5 }));
  });

  it("does not dispatch a duplicate retry after durable sent state", async () => {
    const provider = { send: vi.fn() };
    const repository = { claimNotification: vi.fn().mockResolvedValue(null), findNotificationStatus: vi.fn().mockResolvedValue({ delivery_status: "sent", attempts: 1 }) };
    await expect(deliverWorkflowNotification({ festival: { id: "f1", revision: 2 }, transition: { toState: "approved" } }, { repository, provider, notificationId: "n1" })).resolves.toMatchObject({ sent: true, delivery_status: "sent", retry_needed: false });
    expect(provider.send).not.toHaveBeenCalled();
  });

  it("returns the committed transition when post-commit claim bookkeeping throws", async () => {
    const repository = {
      findForTransition: vi.fn().mockResolvedValue({ id: "f1", name: "Fest", workflow_state: "pending_review", revision: 4 }),
      transition: vi.fn().mockResolvedValue({ id: "f1", name: "Fest", workflow_state: "approved", revision: 5 }),
      claimNotification: vi.fn().mockRejectedValue(new Error("db unavailable")),
    };
    await expect(transitionFestival("f1", { expected_revision: 4, to_state: "approved" }, { repository, user: { id: "a1", role: "admin" } })).resolves.toMatchObject({ festival: { workflow_state: "approved" }, notification: { sent: false, retry_needed: true } });
  });

  it("escapes HTML and never includes the private internal reason", () => {
    const message = buildWorkflowNotification({ festival: { name: "<img src=x>" }, transition: { toState: "changes_requested", producerMessage: "Use <script>alert(1)</script>", reason: "PRIVATE SECRET" }, recipientEmail: "owner@example.test" });
    expect(message.html).toContain("&lt;script&gt;");
    expect(message.html).not.toContain("<script>");
    expect(message.html).not.toContain("PRIVATE SECRET");
  });

  it("retries to the immutable outbox recipient after the current contact changes", async () => {
    const provider = { send: vi.fn().mockResolvedValue({ success: true, id: "provider-2" }) };
    const repository = {
      findNotificationForRetry: vi.fn().mockResolvedValue({
        festival: { id: "f1", revision: 7, name: "Revision name", contact_email: "changed@example.test" },
        transition: { to_state: "changes_requested", producer_message: "Please revise." },
        recipientEmail: "original@example.test",
      }),
      claimNotification: vi.fn().mockResolvedValue({ id: "n1", attempts: 2, recipient_email: "original@example.test" }),
      markNotificationSent: vi.fn().mockResolvedValue({ count: 1 }),
    };
    await retryWorkflowNotification("f1", "n1", { repository, notificationProvider: provider, createAttemptToken: () => "retry-token" });
    expect(provider.send).toHaveBeenCalledWith(expect.objectContaining({
      to: "original@example.test",
      subject: expect.stringContaining("Revision name"),
    }), expect.anything());
    expect(provider.send.mock.calls[0][0].to).not.toBe("changed@example.test");
  });
});

describe("immutable festival revision snapshots", () => {
  it("allowlists every reviewable scalar and excludes auth, consent, and provider fields", () => {
    const snapshot = buildFestivalRevisionSnapshot({
      id: "f1", name: "Fest", slug: "fest", description: null, location: null, city: "Philadelphia", state: "PA",
      zip_code: null, website_url: null, contact_name: null, contact_email: null, contact_phone: null,
      calendar_date_type: "timed", time_zone: "America/New_York", start_date: null, end_date: null,
      all_day_start: null, all_day_end: null, calendar_status: "confirmed", calendar_sequence: 4,
      calendar_published_at: new Date("2026-07-01T12:00:00.000Z"), first_published_at: new Date("2026-07-01T12:00:00.000Z"),
      published_at: null, canceled_at: new Date("2026-08-01T12:00:00.000Z"), public_message: "Canceled due to weather.",
      workflow_state: "canceled", revision: 4, image_url: "https://example.test/public-hero.jpg", logo_url: null,
      password_hash: "secret", submission_key: "private", terms_acknowledged_at: new Date(), drive_file_id: "private-drive",
    });
    expect(Object.keys(snapshot)).toEqual(FESTIVAL_REVISION_SNAPSHOT_FIELDS);
    expect(snapshot).toMatchObject({
      id: "f1",
      name: "Fest",
      workflow_state: "canceled",
      revision: 4,
      image_url: "https://example.test/public-hero.jpg",
      first_published_at: "2026-07-01T12:00:00.000Z",
      canceled_at: "2026-08-01T12:00:00.000Z",
      public_message: "Canceled due to weather.",
    });
    expect(snapshot).not.toHaveProperty("password_hash");
    expect(snapshot).not.toHaveProperty("submission_key");
    expect(snapshot).not.toHaveProperty("terms_acknowledged_at");
    expect(snapshot).not.toHaveProperty("drive_file_id");
  });
});

describe("asset review concurrency policy", () => {
  it.each(["canceled", "archived", "draft", "rejected"])("rejects review in %s", (workflow_state) => {
    expect(isAssetReviewPermitted({ workflow_state, revision: 3 }, 3)).toBe(false);
  });
  it("requires the exact festival revision in a permissible workflow state", () => {
    expect(isAssetReviewPermitted({ workflow_state: "pending_review", revision: 3 }, 3)).toBe(true);
    expect(isAssetReviewPermitted({ workflow_state: "pending_review", revision: 4 }, 3)).toBe(false);
  });
});

describe("private asset publication eligibility", () => {
  const safe = { scan_status: "clean", lifecycle_status: "active", editorial_status: "approved", rights_version: 1, alt_text: "Crowd at the festival" };
  it("requires every safety and publication gate", () => {
    expect(isPublicAssetEligible(safe, { workflow_state: "published" })).toBe(true);
    for (const patch of [{ scan_status: "pending" }, { lifecycle_status: "quarantined" }, { editorial_status: "pending" }, { rights_version: 0 }, { alt_text: " " }]) {
      expect(isPublicAssetEligible({ ...safe, ...patch }, { workflow_state: "published" })).toBe(false);
    }
    expect(isPublicAssetEligible(safe, { workflow_state: "approved" })).toBe(false);
  });
});
