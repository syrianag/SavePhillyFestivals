import { describe, expect, it, vi } from "vitest";
import { CONSENT_TEXT, organizerConsentSchema, n8nClaimSchema, n8nReportSchema } from "@/features/organizer-consent/organizer-consent-schema";
import { constantTimeSecretMatches, extractTrustedRequestIp, redactedOutboxError, sha256 } from "@/features/organizer-consent/organizer-consent-security";
import { completedState, isClaimable, nextFailureState } from "@/features/organizer-consent/organizer-outbox-state";
import { POST as claimOutbox } from "@/app/api/internal/n8n/organizer-subscriptions/claim/route";
import { POST as reportOutbox } from "@/app/api/internal/n8n/organizer-subscriptions/report/route";
import { eligibleOrganizerResult, parentFestivalIds } from "@/features/organizer-consent/organizer-consent-resolution";
import { consentRequestFingerprint, ConsentConflictError, NoEligibleOrganizerError, submitOrganizerConsent } from "@/features/organizer-consent/organizer-consent-service";

const organizerId = "d80e4eb4-2291-4ce5-98bb-3e26e510ec36";
const submissionKey = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
function validInput(overrides = {}) {
  return { email: "visitor@example.com", submission_key: submissionKey, selection: { version: 1, items: [{ type: "event", id: "event-1" }] }, organizer_ids: [organizerId], preferences: ["reminders", "updates"], consent_acknowledged: true, consent_version: 1, preference_version: 1, source: "schedule_builder", ...overrides };
}
function repository(overrides = {}) {
  return {
    findConsentBySubmissionKey: vi.fn(async () => null),
    resolveEligible: vi.fn(async () => ({ festivalIds: ["festival-1"], organizers: [{ id: organizerId, name: "Festival team", festival_id: "festival-1" }] })),
    findSuppressedOrganizerIds: vi.fn(async () => []),
    createConsent: vi.fn(async (data) => ({ id: data.id })),
    revokeConsent: vi.fn(),
    ...overrides,
  };
}

describe("organizer consent schema", () => {
  it("normalizes email and requires explicit nonempty organizer and preference choices", () => {
    const parsed = organizerConsentSchema.parse(validInput({ email: " Visitor@Example.COM " }));
    expect(parsed.email).toBe("visitor@example.com");
    for (const change of [
      { organizer_ids: [] }, { preferences: [] }, { preferences: ["news"] },
      { consent_acknowledged: false }, { consent_version: 2 }, { source: "client_claimed_source" },
    ]) expect(organizerConsentSchema.safeParse(validInput(change)).success).toBe(false);
    expect(organizerConsentSchema.safeParse({ ...validInput(), consent_text: CONSENT_TEXT }).success).toBe(false);
  });

  it("validates strict bounded N8N claim and outcome-specific report payloads", () => {
    expect(n8nClaimSchema.safeParse({ limit: 25, worker_id: "worker-1" }).success).toBe(true);
    expect(n8nClaimSchema.safeParse({ limit: 26, worker_id: "worker-1" }).success).toBe(false);
    expect(n8nReportSchema.safeParse({ outbox_id: submissionKey, lease_token: "a".repeat(43), outcome: "completed", provider_result_id: "provider-1" }).success).toBe(true);
    expect(n8nReportSchema.safeParse({ outbox_id: submissionKey, lease_token: "a".repeat(43), outcome: "completed", error_code: "secret" }).success).toBe(false);
    expect(n8nReportSchema.safeParse({ outbox_id: submissionKey, lease_token: "a".repeat(43), outcome: "failed", retryable: true, error_code: "provider_error" }).success).toBe(true);
  });
});

describe("trusted request IP and N8N auth", () => {
  const request = (forwarded) => ({ headers: new Headers(forwarded ? { "x-forwarded-for": forwarded } : {}) });
  it("ignores spoofable forwarding headers unless trusted hops are configured", () => {
    expect(extractTrustedRequestIp(request("198.51.100.5, 10.0.0.2"), "0")).toBe("unknown");
    expect(extractTrustedRequestIp(request("198.51.100.5, 10.0.0.2"), "2")).toBe("198.51.100.5");
    expect(extractTrustedRequestIp(request("bad-ip"), "1")).toBe("unknown");
  });
  it("uses constant-time digest comparison and rejects missing or different secrets", () => {
    expect(constantTimeSecretMatches("shared-secret", "shared-secret")).toBe(true);
    expect(constantTimeSecretMatches("wrong", "shared-secret")).toBe(false);
    expect(constantTimeSecretMatches("", "shared-secret")).toBe(false);
  });
});

describe("N8N API authentication contract", () => {
  it("rejects missing/invalid auth before repository access and validates authorized payload strictly", async () => {
    const previous = process.env.N8N_ORGANIZER_OUTBOX_SECRET;
    process.env.N8N_ORGANIZER_OUTBOX_SECRET = "unit-test-shared-secret";
    try {
      const missing = await claimOutbox(new Request("http://app.test/claim", { method: "POST", body: "{}" }));
      expect(missing.status).toBe(401);
      const invalid = await reportOutbox(new Request("http://app.test/report", { method: "POST", headers: { authorization: "Bearer wrong", "content-type": "application/json" }, body: "{}" }));
      expect(invalid.status).toBe(401);
      const malformed = await claimOutbox(new Request("http://app.test/claim", { method: "POST", headers: { authorization: "Bearer unit-test-shared-secret", "content-type": "application/json" }, body: JSON.stringify({ limit: 100, worker_id: "worker", extra: true }) }));
      expect(malformed.status).toBe(400);
    } finally {
      if (previous === undefined) delete process.env.N8N_ORGANIZER_OUTBOX_SECRET;
      else process.env.N8N_ORGANIZER_OUTBOX_SECRET = previous;
    }
  });
});

describe("approved parent and authorized organizer resolution", () => {
  it("maps approved events to unique parents and filters disabled/revoked integrations", () => {
    const ids = parentFestivalIds([{ type: "event", id: "event-1" }, { type: "festival", id: "festival-2" }], [{ id: "festival-2" }], [{ id: "event-1", festival_id: "festival-1" }]);
    expect(ids).toEqual(["festival-1", "festival-2"]);
    const eligible = eligibleOrganizerResult(ids, [
      { id: "one", organizer_name: "One", festival_id: "festival-1", enabled: true, authorization_status: "authorized" },
      { id: "two", organizer_name: "Two", festival_id: "festival-2", enabled: false, authorization_status: "authorized" },
      { id: "three", organizer_name: "Three", festival_id: "festival-2", enabled: true, authorization_status: "revoked" },
    ]);
    expect(eligible.map(({ id }) => id)).toEqual(["one"]);
  });
});

describe("consent evidence and idempotent outbox creation", () => {
  it("persists server-owned evidence and one stable key per still-authorized selected organizer", async () => {
    const repo = repository();
    const result = await submitOrganizerConsent(validInput(), { repository: repo, requestIp: "198.51.100.5" });
    const data = repo.createConsent.mock.calls[0][0];
    expect(result).toMatchObject({ queued_organizers: 1, ineligible_organizers: 0, replayed: false });
    expect(data).toMatchObject({ email: "visitor@example.com", consentText: CONSENT_TEXT, requestIp: "198.51.100.5", festivalIds: ["festival-1"], maxAttempts: 5 });
    expect(data.managementTokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(data.idempotencyKeys.get(organizerId)).toBe(sha256(`${data.id}:${organizerId}:1`));
  });

  it("reports partial eligibility truthfully and never queues a client-selected unauthorized organizer", async () => {
    const unauthorized = "7de186c4-38a2-4e66-bde5-e536ec0c6531";
    const repo = repository();
    const result = await submitOrganizerConsent(validInput({ organizer_ids: [organizerId, unauthorized] }), { repository: repo, requestIp: "unknown" });
    expect(result).toMatchObject({ queued_organizers: 1, ineligible_organizers: 1 });
    expect(repo.createConsent.mock.calls[0][0].organizers.map(({ id }) => id)).toEqual([organizerId]);
  });

  it("rejects no eligibility and conflicting replay, while exact replay creates no work", async () => {
    await expect(submitOrganizerConsent(validInput(), { repository: repository({ resolveEligible: vi.fn(async () => ({ festivalIds: [], organizers: [] })) }), requestIp: "unknown" })).rejects.toBeInstanceOf(NoEligibleOrganizerError);
    const existing = { id: "consent-1", request_fingerprint: consentRequestFingerprint(validInput()), organizers: [{ organizer_integration_id: organizerId }] };
    const exact = repository({ findConsentBySubmissionKey: vi.fn(async () => existing) });
    await expect(submitOrganizerConsent(validInput(), { repository: exact, requestIp: "unknown" })).resolves.toMatchObject({ replayed: true, queued_organizers: 1 });
    expect(exact.createConsent).not.toHaveBeenCalled();
    const conflict = repository({ findConsentBySubmissionKey: vi.fn(async () => existing) });
    await expect(submitOrganizerConsent(validInput({ email: "other@example.com" }), { repository: conflict, requestIp: "unknown" })).rejects.toBeInstanceOf(ConsentConflictError);
  });

  it("does not resubscribe an organizer-scoped suppressed address", async () => {
    const repo = repository({ findSuppressedOrganizerIds: vi.fn(async () => [organizerId]) });
    await expect(submitOrganizerConsent(validInput(), { repository: repo, requestIp: "unknown" })).rejects.toBeInstanceOf(NoEligibleOrganizerError);
    expect(repo.createConsent).not.toHaveBeenCalled();
  });

  it("turns a concurrent unique-key race into an exact replay", async () => {
    const input = validInput();
    const raced = { id: "raced-consent", request_fingerprint: consentRequestFingerprint(input), organizers: [{ organizer_integration_id: organizerId }] };
    const repo = repository({
      findConsentBySubmissionKey: vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(raced),
      createConsent: vi.fn(async () => { throw { code: "P2002" }; }),
    });
    await expect(submitOrganizerConsent(input, { repository: repo, requestIp: "unknown" })).resolves.toMatchObject({ consent_id: "raced-consent", replayed: true });
  });
});

describe("outbox state machine, retry bound, replay safety, and redaction", () => {
  const now = new Date("2026-08-04T12:00:00Z");
  it("claims only due work below the bound", () => {
    expect(isClaimable({ status: "pending", next_attempt_at: now, attempts: 0, max_attempts: 5 }, now)).toBe(true);
    expect(isClaimable({ status: "pending", next_attempt_at: now, attempts: 5, max_attempts: 5 }, now)).toBe(false);
    expect(isClaimable({ status: "completed", next_attempt_at: now, attempts: 1, max_attempts: 5 }, now)).toBe(false);
  });
  it("backs off retryable failures and makes permanent or exhausted failures terminal", () => {
    expect(nextFailureState({ status: "processing", attempts: 1, max_attempts: 5 }, { retryable: true, errorCode: "provider_error", now })).toMatchObject({ status: "pending", next_attempt_at: new Date("2026-08-04T12:01:00Z") });
    expect(nextFailureState({ status: "processing", attempts: 5, max_attempts: 5 }, { retryable: true, errorCode: "provider_error", now }).status).toBe("failed");
    expect(nextFailureState({ status: "processing", attempts: 1, max_attempts: 5 }, { retryable: false, errorCode: "invalid_recipient", now }).status).toBe("failed");
    expect(() => completedState({ status: "completed" }, "again", now)).toThrow("invalid_outbox_transition");
  });
  it("stores only allowlisted redacted error codes", () => {
    expect(redactedOutboxError("temporary_provider_error")).toBe("temporary_provider_error");
    expect(redactedOutboxError("visitor@example.com rejected: secret")).toBe("provider_error");
  });
});
