import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it, vi } from "vitest";

import {
  handleCreateDraft,
  handleGetOwned,
  handlePatchOwned,
  handleProducerCapabilities,
  handleUploadAsset,
} from "@/features/producer-submission/producer-submission-http";
import { PRODUCER_MULTIPART_MAX_BYTES } from "@/features/producer-submission/producer-submission-schema";

const projectRoot = resolve(import.meta.dirname, "../..");
const read = (path) => readFileSync(resolve(projectRoot, path), "utf8");
const modelBlock = (schema, name) => schema.match(new RegExp(`model ${name} \\{[\\s\\S]*?\\n\\}`))?.[0] || "";
const tableBlock = (migration, name) => migration.match(new RegExp(`CREATE TABLE "${name}" \\([\\s\\S]*?\\n\\);`))?.[0] || "";
const userId = "efce8c4b-ee6e-4da9-8fdd-54f187938a45";
const festivalId = "8fe0c269-81d1-412c-a3c4-a73c940f8f36";
const submissionKey = "4319a9ca-3c0b-4aa1-8a72-65ba7a55d115";
const originHeaders = { origin: "https://festivals.example", "sec-fetch-site": "same-origin" };

function dependencies(repository = {}) {
  return {
    getSession: vi.fn(async () => ({ user: { id: userId, role: "admin" } })),
    userRepository: { findCurrentUser: vi.fn(async () => ({ id: userId, email: "admin@example.com", email_verified: new Date(), role: "admin" })) },
    repository,
    provider: { isOperational: async () => true, uploadPrivate: vi.fn(), deletePrivate: vi.fn() },
    rateLimiter: { consume: vi.fn(() => true) },
    siteUrl: "https://festivals.example",
  };
}

function jsonRequest(body, headers = {}) {
  return new Request("https://festivals.example/api/producer/festivals", {
    method: "POST", headers: { "content-type": "application/json", ...originHeaders, ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function uploadRequest(body, { contentLength } = {}) {
  const headers = new Headers({ "content-type": "multipart/form-data; boundary=test", ...originHeaders });
  if (contentLength !== undefined) headers.set("content-length", contentLength);
  return new Request(`https://festivals.example/api/producer/festivals/${festivalId}/assets`, { method: "POST", headers, body });
}

const context = { params: Promise.resolve({ id: festivalId }) };

describe("producer route security contracts", () => {
  it("returns 404 for cross-owner IDs and does not grant admin ownership bypass", async () => {
    const repository = { findOwned: vi.fn(async () => null) };
    const response = await handleGetOwned(new Request("https://festivals.example"), context, dependencies(repository));
    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(repository.findOwned).toHaveBeenCalledWith(userId, festivalId);
  });

  it("enforces same-origin mutation policy and an injectable 429 limiter", async () => {
    const repository = { findOwnedBySubmissionKey: vi.fn(), createOwnedDraft: vi.fn() };
    expect((await handleCreateDraft(new Request("https://festivals.example", { method: "POST", headers: { "content-type": "application/json", origin: "https://evil.example", "sec-fetch-site": "cross-site" }, body: JSON.stringify({ submission_key: submissionKey }) }), dependencies(repository))).status).toBe(403);
    const deps = dependencies(repository);
    deps.rateLimiter.consume.mockReturnValue(false);
    expect((await handleCreateDraft(jsonRequest({ submission_key: submissionKey }), deps)).status).toBe(429);
  });

  it("fails closed in production without a canonical origin or verified edge limiter", async () => {
    const repository = { findOwnedBySubmissionKey: vi.fn(), createOwnedDraft: vi.fn() };
    const missingOrigin = dependencies(repository);
    Object.assign(missingOrigin, { siteUrl: undefined, nodeEnv: "production", edgeRateLimitVerified: true });
    expect((await handleCreateDraft(jsonRequest({ submission_key: submissionKey }), missingOrigin)).status).toBe(403);

    const missingEdge = dependencies(repository);
    Object.assign(missingEdge, { nodeEnv: "production", edgeRateLimitVerified: false });
    const response = await handleCreateDraft(jsonRequest({ submission_key: submissionKey }), missingEdge);
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ code: "edge_rate_limit_unverified" });
    const patchResponse = await handlePatchOwned(new Request(`https://festivals.example/api/producer/festivals/${festivalId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", ...originHeaders },
      body: JSON.stringify({ expected_revision: 1, name: "Blocked update" }),
    }), context, missingEdge);
    expect(patchResponse.status).toBe(503);

    const capabilities = await handleProducerCapabilities(new Request("https://festivals.example"), missingEdge);
    expect(await capabilities.json()).toEqual({ uploads: { enabled: false }, mutations: { enabled: false } });
  });

  it("enforces media type, JSON limits, strict fields, and private responses", async () => {
    const repository = { findOwnedBySubmissionKey: vi.fn(async () => null), createOwnedDraft: vi.fn(async () => ({ id: festivalId, workflow_state: "draft", revision: 0 })) };
    expect((await handleCreateDraft(new Request("https://festivals.example", { method: "POST", headers: { "content-type": "text/plain", ...originHeaders }, body: "{}" }), dependencies(repository))).status).toBe(415);
    expect((await handleCreateDraft(jsonRequest({}, { "content-length": "40000" }), dependencies(repository))).status).toBe(413);
    expect((await handleCreateDraft(jsonRequest({ padding: "x".repeat(33 * 1024) }), dependencies(repository))).status).toBe(413);
    expect((await handleCreateDraft(jsonRequest({ submission_key: submissionKey, status: "approved" }), dependencies(repository))).status).toBe(400);
    const valid = await handleCreateDraft(jsonRequest({ submission_key: submissionKey }), dependencies(repository));
    expect(valid.status).toBe(201);
    expect(valid.headers.get("cache-control")).toBe("private, no-store");
    expect(await valid.text()).not.toContain("owner_user_id");
  });

  it("reloads current authorization and scopes PATCH by owner/revision", async () => {
    const repository = { updateOwnedEditable: vi.fn(async (input) => ({ id: input.festivalId, name: input.data.name, workflow_state: "draft", revision: 2 })) };
    const deps = dependencies(repository);
    const request = new Request("https://festivals.example", { method: "PATCH", headers: { "content-type": "application/json", ...originHeaders }, body: JSON.stringify({ expected_revision: 1, name: "Owned Festival" }) });
    const response = await handlePatchOwned(request, context, deps);
    expect(response.status).toBe(200);
    expect(deps.userRepository.findCurrentUser).toHaveBeenCalledWith(userId);
    expect(deps.rateLimiter.consume).toHaveBeenCalledWith(expect.objectContaining({ userId, operation: "patch" }));
    expect(repository.updateOwnedEditable).toHaveBeenCalledWith(expect.objectContaining({ ownerUserId: userId, festivalId, expectedRevision: 1 }));
  });

  it("requires bounded Content-Length and rejects invalid, declared, and misleading actual overflow", async () => {
    const deps = dependencies({});
    expect((await handleUploadAsset(uploadRequest("--test--\r\n"), context, deps)).status).toBe(411);
    expect((await handleUploadAsset(uploadRequest("--test--\r\n", { contentLength: "invalid" }), context, deps)).status).toBe(411);
    expect((await handleUploadAsset(uploadRequest("x", { contentLength: String(PRODUCER_MULTIPART_MAX_BYTES + 1) }), context, deps)).status).toBe(413);
    const misleading = new Uint8Array(PRODUCER_MULTIPART_MAX_BYTES + 1);
    expect((await handleUploadAsset(uploadRequest(misleading, { contentLength: "100" }), context, deps)).status).toBe(413);
  });
});

describe("database, moderation, and static route contracts", () => {
  it("keeps model-specific email fields aligned with the exact F-07 migration", () => {
    const schema = read("prisma/schema.prisma");
    const migration = read("prisma/migrations/20260804050000_producer_submission_workflow/migration.sql");
    const notification = modelBlock(schema, "ProducerSubmissionNotification");
    const scheduleEmail = modelBlock(schema, "ScheduleEmailRequest");
    const migratedNotification = tableBlock(migration, "ProducerSubmissionNotification");
    const reconciliation = modelBlock(schema, "FestivalAssetReconciliation");
    expect(modelBlock(schema, "Festival")).toMatch(/workflow_state\s+FestivalWorkflowState @default\(draft\)/);
    expect(notification).toContain("attempt_token");
    expect(notification).toContain("attempt_started_at");
    expect(scheduleEmail).toContain("failure_message");
    /* F-04 later gained its own delivery lease. The models must stay distinct: schedule email
     * owns a lease for safe retries but must never take producer-notification routing fields. */
    expect(scheduleEmail).not.toContain("notification_type");
    expect(scheduleEmail).not.toContain("recipient_alias");
    expect(scheduleEmail).not.toContain("workflow_revision");
    expect(notification).not.toContain("idempotency_key");
    expect(notification).not.toContain("selection_version");
    expect(migratedNotification).toContain('"attempt_token" TEXT');
    expect(migratedNotification).toContain('"attempt_started_at" TIMESTAMP(3)');
    expect(reconciliation).toContain("provider_file_id");
    expect(reconciliation).toContain("reconciliation_marker");
    expect(reconciliation).toContain("cleanup_attempts");
    expect(migration).toContain('CREATE TABLE "FestivalAssetReconciliation"');
    expect(migration).toContain("Festival_review_status_coherence");
    expect(migration).toContain("ProducerSubmissionNotification_recipient_kind");
    expect(migration).toContain("ProducerSubmissionNotification_attempt_token_key");
    expect(migration).toContain("FestivalTransition_append_only_update_trigger");
    expect(migration).toContain("FestivalTransition_append_only_delete_trigger");
  });

  it("atomically aligns producer submit and creates contact-targeted outbox records", () => {
    const repository = read("src/features/producer-submission/producer-submission-repository.js");
    expect(repository).toContain('workflow_state: "pending_review"');
    expect(repository).not.toMatch(/workflow_state:\s*"pending_review",\s*status:/);
    expect(repository).toContain("transaction.festivalRevision.create");
    expect(repository).toContain("transaction.festivalOccurrence.upsert");
    expect(repository).toContain("recipient_email: current.contact_email");
    expect(repository).toContain("transaction.festivalTransition.create");
    expect(repository).toContain("transaction.producerSubmissionNotification.createMany");
    expect(repository).toContain("claimSubmissionNotification");
    expect(repository).toContain("markSubmissionNotificationSent");
    expect(repository).toContain("markSubmissionNotificationFailed");
  });

  it("retires legacy moderation in favor of the central authenticated transition route", () => {
    const route = read("src/app/api/festivals/[id]/approve/route.js");
    const transition = read("src/features/editorial-workflow/editorial-service.js");
    expect(route).toContain("status: 410");
    expect(transition).toContain("assertEditorialTransition");
    expect(transition).toContain("expectedRevision: input.expected_revision");
    expect(transition).toContain("actorUserId: user.id");
  });

  it("preserves public DTO presentation and redirects pending links to the workflow queue", () => {
    const queries = read("src/features/festivals/festival-queries.js");
    const legacyRoute = read("src/app/api/festivals/[id]/route.js");
    const pending = read("src/app/admin/pending/page.jsx");
    expect(queries).toContain("publishedDiscoveryWhere");
    expect(queries).toContain("publicDetailWhere");
    expect(legacyRoute).toContain("getApprovedFestivalById");
    expect(legacyRoute).not.toContain("findUnique");
    expect(pending).toContain("state=pending_review");
  });

  it("keeps provider clients dynamically server-loaded and private responses uncached", () => {
    const http = read("src/features/producer-submission/producer-submission-http.js");
    expect(http).toMatch(/import\("@\/lib\/auth"\)/);
    expect(http).toMatch(/await import\("@\/lib\/google-drive"\)/);
    expect(http).toMatch(/await import\("@\/lib\/mail"\)/);
    expect(http).toContain('"Cache-Control": "private, no-store"');
  });
});
