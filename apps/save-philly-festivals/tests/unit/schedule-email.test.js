import { describe, expect, it, vi } from "vitest";

import { buildScheduleEmailContent } from "@/features/schedule-email/schedule-email-content";
import { mapApprovedScheduleSelections } from "@/features/schedule-email/schedule-email-resolution";
import {
  MAX_SCHEDULE_EMAIL_ITEMS,
  scheduleEmailRequestSchema,
} from "@/features/schedule-email/schedule-email-schema";
import {
  IdempotencyConflictError,
  NoResolvedScheduleItemsError,
  redactedDeliveryFailure,
  submitScheduleEmail,
} from "@/features/schedule-email/schedule-email-service";
import { sendTransactionalEmail } from "@/lib/mail";

const key = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";

function validInput(overrides = {}) {
  return {
    email: "visitor@example.com",
    idempotency_key: key,
    selection: {
      version: 1,
      items: [
        { type: "festival", id: "festival-1" },
        { type: "event", id: "event-1" },
      ],
    },
    ...overrides,
  };
}

function resolvedSelection() {
  return {
    resolved: [
      {
        type: "festival",
        id: "festival-1",
        record: {
          id: "festival-1",
          name: "Festival One",
          slug: "festival-one",
          location: "Philadelphia",
          start_date: new Date("2026-09-12T14:00:00.000Z"),
        },
      },
      {
        type: "event",
        id: "event-1",
        record: {
          id: "event-1",
          title: "Opening Parade",
          location: "Main Street",
          start_time: new Date("2026-09-12T16:00:00.000Z"),
          festival: { id: "festival-1", name: "Festival One", slug: "festival-one" },
        },
      },
    ],
    unavailable: [],
  };
}

function fakeRepository({ resolution = resolvedSelection(), existing = null } = {}) {
  let request = existing;
  const repository = {
    findByIdempotencyKey: vi.fn(async () => request),
    findById: vi.fn(async () => request),
    resolveApproved: vi.fn(async () => resolution),
    createRequest: vi.fn(async ({ email, idempotencyKey, version, items }) => {
      request = {
        id: "request-1",
        recipient_email: email,
        idempotency_key: idempotencyKey,
        selection_version: version,
        delivery_status: "pending",
        attempts: 0,
        attempt_token: null,
        items: items.map((item) => ({
          item_type: item.type,
          item_id: item.id,
          resolution_status: item.resolutionStatus,
        })),
      };
      return request;
    }),
    claimDelivery: vi.fn(async ({ attemptToken, attemptedAt, staleBefore, maxAttempts }) => {
      if (!request || request.delivery_status === "sent") return null;
      if (request.attempt_token && request.attempt_started_at >= staleBefore) return null;
      if ((request.attempts || 0) >= maxAttempts) return null;
      Object.assign(request, {
        delivery_status: "pending",
        attempts: (request.attempts || 0) + 1,
        attempt_token: attemptToken,
        attempt_started_at: attemptedAt,
        failure_code: null,
        failure_message: null,
      });
      return request;
    }),
    markSent: vi.fn(async ({ attemptToken, providerMessageId, sentAt }) => {
      if (request.attempt_token !== attemptToken) return { count: 0 };
      Object.assign(request, {
        delivery_status: "sent",
        provider_message_id: providerMessageId,
        sent_at: sentAt,
        attempt_token: null,
        attempt_started_at: null,
      });
      return { count: 1 };
    }),
    markFailed: vi.fn(async ({ attemptToken, failure }) => {
      if (request.attempt_token !== attemptToken) return { count: 0 };
      Object.assign(request, {
        delivery_status: "failed",
        failure_code: failure.code,
        failure_message: failure.message,
        attempt_token: null,
        attempt_started_at: null,
      });
      return { count: 1 };
    }),
  };
  return repository;
}

describe("schedule email request schema", () => {
  it("normalizes email and accepts only strict versioned mixed items", () => {
    const parsed = scheduleEmailRequestSchema.parse(validInput({ email: "  Visitor@Example.COM " }));
    expect(parsed.email).toBe("visitor@example.com");
    expect(parsed.selection.items).toEqual([
      { type: "festival", id: "festival-1" },
      { type: "event", id: "event-1" },
    ]);

    expect(scheduleEmailRequestSchema.safeParse({ ...validInput(), marketing_consent: true }).success).toBe(false);
    expect(scheduleEmailRequestSchema.safeParse({
      ...validInput(),
      selection: { version: 2, items: [{ type: "festival", id: "festival-1" }] },
    }).success).toBe(false);
    expect(scheduleEmailRequestSchema.safeParse({
      ...validInput(),
      selection: { version: 1, items: [{ type: "festival", id: "festival-1", title: "Untrusted" }] },
    }).success).toBe(false);
    expect(scheduleEmailRequestSchema.safeParse({
      ...validInput(),
      selection: { version: 1, items: [{ type: "schedule", id: "festival-1" }] },
    }).success).toBe(false);
  });

  it("enforces nonempty, unique selections and the maximum count", () => {
    expect(scheduleEmailRequestSchema.safeParse({
      ...validInput(), selection: { version: 1, items: [] },
    }).success).toBe(false);
    expect(scheduleEmailRequestSchema.safeParse({
      ...validInput(),
      selection: {
        version: 1,
        items: [
          { type: "festival", id: "same" },
          { type: "festival", id: "same" },
        ],
      },
    }).success).toBe(false);
    expect(scheduleEmailRequestSchema.safeParse({
      ...validInput(),
      selection: {
        version: 1,
        items: Array.from({ length: MAX_SCHEDULE_EMAIL_ITEMS + 1 }, (_, index) => ({
          type: "event",
          id: `event-${index}`,
        })),
      },
    }).success).toBe(false);
  });
});

describe("approved schedule resolution", () => {
  it("preserves request order and marks unknown or unapproved records unavailable", () => {
    const items = [
      { type: "event", id: "event-stale" },
      { type: "festival", id: "festival-approved" },
      { type: "event", id: "event-approved" },
      { type: "festival", id: "festival-unapproved" },
    ];
    const result = mapApprovedScheduleSelections(items, {
      festivals: [{ id: "festival-approved", name: "Approved" }],
      events: [{ id: "event-approved", title: "Approved event" }],
    });

    expect(result.resolved.map(({ type, id }) => ({ type, id }))).toEqual([
      { type: "festival", id: "festival-approved" },
      { type: "event", id: "event-approved" },
    ]);
    expect(result.unavailable).toEqual([
      { type: "event", id: "event-stale" },
      { type: "festival", id: "festival-unapproved" },
    ]);
  });
});

describe("schedule email content", () => {
  it("escapes server values, formats Philadelphia times, and does not expose unavailable IDs", () => {
    const content = buildScheduleEmailContent({
      resolved: [{
        type: "event",
        id: "event-1",
        record: {
          title: '<img src=x onerror="alert(1)"> & Parade',
          location: "Penn's Landing",
          start_time: new Date("2026-09-12T16:00:00.000Z"),
          festival: { name: "Arts <Fest>", slug: "arts/fest" },
        },
      }],
      unavailableCount: 1,
      siteUrl: "https://festivals.example/path",
    });

    expect(content.subject).toBe("Your Save Philly Festivals schedule");
    expect(content.html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt; &amp; Parade");
    expect(content.html).toContain("Penn&#39;s Landing");
    expect(content.html).toContain("Saturday, September 12, 2026 at 12:00 PM EDT");
    expect(content.html).toContain("/festivals/arts%2Ffest");
    expect(content.html).not.toContain("<img src=x");
    expect(content.html).not.toContain("event-stale");
    expect(content.text).toContain("does not subscribe you to marketing");
  });
});

describe("idempotent delivery service", () => {
  it("persists all selections and maps provider success to sent", async () => {
    const repository = fakeRepository();
    const provider = { send: vi.fn(async () => ({ success: true, id: "provider-1" })) };

    const result = await submitScheduleEmail(validInput(), { repository, provider });

    expect(result).toMatchObject({ status: "sent", email_sent: true, replayed: false });
    expect(repository.createRequest).toHaveBeenCalledTimes(1);
    expect(repository.createRequest.mock.calls[0][0].items).toHaveLength(2);
    expect(provider.send).toHaveBeenCalledTimes(1);
    expect(repository.markSent).toHaveBeenCalledWith(expect.objectContaining({
      id: "request-1",
      providerMessageId: "provider-1",
    }));
    expect(provider.send.mock.calls[0][1]).toEqual({ idempotencyKey: "schedule-email/request-1" });
  });

  it("records a redacted provider failure and safely retries the same key", async () => {
    const repository = fakeRepository();
    const provider = {
      send: vi.fn()
        .mockResolvedValueOnce({ success: false, code: "provider_error", error: "visitor@example.com rejected: secret" })
        .mockResolvedValueOnce({ success: true, id: "provider-retry" }),
    };

    const first = await submitScheduleEmail(validInput(), { repository, provider });
    const storedFailure = repository.markFailed.mock.calls[0][0].failure;
    const retry = await submitScheduleEmail(validInput(), { repository, provider });

    expect(first).toMatchObject({ status: "failed", email_sent: false });
    expect(storedFailure).toEqual({
      code: "provider_error",
      message: "The email provider could not complete delivery. Your schedule remains saved in this browser.",
    });
    expect(JSON.stringify(storedFailure)).not.toContain("visitor@example.com");
    expect(retry).toMatchObject({ status: "sent", email_sent: true, replayed: true });
    expect(provider.send).toHaveBeenCalledTimes(2);
    expect(provider.send.mock.calls.map((call) => call[1].idempotencyKey)).toEqual([
      "schedule-email/request-1",
      "schedule-email/request-1",
    ]);
    expect(repository.createRequest).toHaveBeenCalledTimes(1);
  });

  it("suppresses a concurrent retry while another delivery lease is active", async () => {
    const repository = fakeRepository();
    let completeDelivery;
    const provider = { send: vi.fn(() => new Promise((resolve) => { completeDelivery = resolve; })) };

    const first = submitScheduleEmail(validInput(), { repository, provider });
    await vi.waitFor(() => expect(provider.send).toHaveBeenCalledTimes(1));
    const concurrent = await submitScheduleEmail(validInput(), { repository, provider });
    expect(concurrent).toMatchObject({ status: "pending", email_sent: false, replayed: true });
    expect(provider.send).toHaveBeenCalledTimes(1);

    completeDelivery({ success: true, id: "provider-1" });
    await expect(first).resolves.toMatchObject({ status: "sent", email_sent: true });
  });

  it("does not claim or send a failed request at the maximum attempt bound", async () => {
    const repository = fakeRepository({ existing: {
      id: "request-1",
      recipient_email: "visitor@example.com",
      selection_version: 1,
      delivery_status: "failed",
      attempts: 3,
      failure_message: "Delivery exhausted.",
      items: [
        { item_type: "festival", item_id: "festival-1", resolution_status: "resolved" },
        { item_type: "event", item_id: "event-1", resolution_status: "resolved" },
      ],
    } });
    const provider = { send: vi.fn() };

    await expect(submitScheduleEmail(validInput(), { repository, provider }))
      .resolves.toMatchObject({ status: "failed", replayed: true });
    expect(provider.send).not.toHaveBeenCalled();
  });

  it("recovers provider success after bookkeeping failure with one stable provider delivery", async () => {
    const repository = fakeRepository();
    const originalMarkSent = repository.markSent.getMockImplementation();
    repository.markSent.mockRejectedValueOnce(new Error("database unavailable")).mockImplementation(originalMarkSent);
    const delivered = new Map();
    let providerDeliveries = 0;
    const provider = { send: vi.fn(async (_message, { idempotencyKey }) => {
      if (!delivered.has(idempotencyKey)) {
        providerDeliveries += 1;
        delivered.set(idempotencyKey, { success: true, id: "provider-stable" });
      }
      return delivered.get(idempotencyKey);
    }) };
    const times = [new Date("2026-08-05T12:00:00Z"), new Date("2026-08-05T12:06:00Z")];

    const first = await submitScheduleEmail(validInput(), { repository, provider, now: () => times[0], createAttemptToken: () => "attempt-1" });
    const recovered = await submitScheduleEmail(validInput(), { repository, provider, now: () => times[1], createAttemptToken: () => "attempt-2" });

    expect(first).toMatchObject({ status: "pending", email_sent: false });
    expect(recovered).toMatchObject({ status: "sent", email_sent: true, replayed: true });
    expect(provider.send).toHaveBeenCalledTimes(2);
    expect(providerDeliveries).toBe(1);
  });

  it("rejects reuse of an idempotency key for a different submission", async () => {
    const repository = fakeRepository({
      existing: {
        id: "request-other",
        recipient_email: "first@example.com",
        selection_version: 1,
        delivery_status: "sent",
        items: [{ item_type: "festival", item_id: "festival-1", resolution_status: "resolved" }],
      },
    });
    const provider = { send: vi.fn() };
    const changed = validInput({
      email: "other@example.com",
      selection: { version: 1, items: [{ type: "festival", id: "festival-1" }] },
    });

    await expect(submitScheduleEmail(changed, { repository, provider }))
      .rejects.toBeInstanceOf(IdempotencyConflictError);
    expect(provider.send).not.toHaveBeenCalled();
    expect(repository.resolveApproved).not.toHaveBeenCalled();
  });

  it("rejects a request when no approved selection resolves", async () => {
    const repository = fakeRepository({ resolution: { resolved: [], unavailable: validInput().selection.items } });
    const provider = { send: vi.fn() };

    await expect(submitScheduleEmail(validInput(), { repository, provider }))
      .rejects.toBeInstanceOf(NoResolvedScheduleItemsError);
    expect(repository.createRequest).not.toHaveBeenCalled();
    expect(provider.send).not.toHaveBeenCalled();
  });

  it("maps thrown providers to a safe failed status", async () => {
    const repository = fakeRepository();
    const provider = { send: vi.fn(async () => { throw new Error("sensitive provider detail"); }) };

    const result = await submitScheduleEmail(validInput(), { repository, provider });

    expect(result).toMatchObject({ status: "failed", email_sent: false });
    expect(repository.markFailed.mock.calls[0][0].failure.message).not.toContain("sensitive");
  });
});

describe("mail logging", () => {
  it("does not log recipient PII or content when the provider is absent", async () => {
    const logger = { warn: vi.fn(), error: vi.fn() };
    const result = await sendTransactionalEmail(
      {
        to: "private.visitor@example.com",
        subject: "Private schedule subject",
        html: "<p>private schedule body</p>",
      },
      { client: null, logger }
    );

    expect(result).toEqual({ success: false, code: "provider_unconfigured" });
    const logs = JSON.stringify(logger.warn.mock.calls);
    expect(logs).not.toContain("private.visitor@example.com");
    expect(logs).not.toContain("Private schedule subject");
    expect(logs).not.toContain("private schedule body");
  });

  it("maps Resend success and failure without logging provider details", async () => {
    const logger = { warn: vi.fn(), error: vi.fn() };
    const successClient = { emails: { send: vi.fn(async () => ({ data: { id: "message-1" }, error: null })) } };
    await expect(sendTransactionalEmail(
      { to: "visitor@example.com", subject: "Schedule", html: "body" },
      { client: successClient, logger }
    )).resolves.toEqual({ success: true, id: "message-1" });

    const failureClient = { emails: { send: vi.fn(async () => ({ error: { message: "PII detail" } })) } };
    await expect(sendTransactionalEmail(
      { to: "visitor@example.com", subject: "Schedule", html: "body" },
      { client: failureClient, logger }
    )).resolves.toEqual({ success: false, code: "provider_error" });
    expect(JSON.stringify(logger.error.mock.calls)).not.toContain("PII detail");
  });
});

describe("failure redaction", () => {
  it("allows only known operational status", () => {
    expect(redactedDeliveryFailure({ code: "anything", error: "visitor@example.com" })).toEqual({
      code: "provider_error",
      message: "The email provider could not complete delivery. Your schedule remains saved in this browser.",
    });
  });
});
