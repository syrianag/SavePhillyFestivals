import { generateKeyPairSync, sign } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

import {
  FESTIVAL_IMPORT_PRODUCTION_CONFIRMATION,
  FestivalImportError,
  assertRedactedImportValue,
  classifyFestivalImportRecords,
  createFestivalImportService,
  deterministicFestivalImportId,
  festivalCategoryMapChecksum,
  festivalImportPreparedDigest,
  festivalImportReviewApprovalSigningBytes,
} from "@/features/festival-import/festival-import-service";
import { normalizeFestivalImportRecord } from "@/features/festival-import/festival-import-normalization";
import { festivalCsvChecksum } from "@/features/festival-import/festival-import-profile";

const categoryMap = { version: 1, categories: [{ slug: "music", aliases: ["Music"] }] };
const header = "Festival Name,Start Date,End Date,2027 Dates (if applicable),Location,Type,Website,Organiser/Contact,Contact email,Contact Phone,Email sent?";
const source = Buffer.from(`${header}\nOne,1/2/2028,,,A,Music,,Secret Person,secret@example.test,215-555-0100,FALSE\nExact,2/3/2028,,,B,Music,,,,,FALSE\nExact,2/3/2028,,,B,Music,,,,,FALSE\nConflict,3/4/2028,,,C,Music,,,,,FALSE\nConflict,3/4/2028,,,D,Music,,,,,FALSE\n`);
const mapBytes = Buffer.from(JSON.stringify(categoryMap));

function normalized(recordNumber, name, location = "A", type = "Music") {
  return normalizeFestivalImportRecord({
    recordNumber,
    startLine: recordNumber,
    values: {
      "Festival Name": name,
      "Start Date": "1/2/2028",
      "End Date": "",
      "2027 Dates (if applicable)": "",
      Location: location,
      Type: type,
      Website: "",
      "Organiser/Contact": "",
      "Contact email": "",
      "Contact Phone": "",
      "Email sent?": "FALSE",
    },
  }, { categoryMap });
}

function durable(prepared, status = "prepared") {
  const batch = {
    id: prepared.id,
    source_name: prepared.sourceName,
    source_checksum_sha256: prepared.sourceChecksum,
    category_map_checksum_sha256: prepared.categoryMapChecksum,
    prepared_digest_sha256: prepared.preparedDigest,
    prepared_counts: prepared.preparedCounts,
    import_profile: prepared.profileName,
    import_profile_version: prepared.profileVersion,
    environment: prepared.environment,
    operator_user_id: prepared.operatorUserId,
    reviewer_user_id: null,
    reviewed_at: null,
    status,
    total_row_count: prepared.counts.total,
    ready_row_count: prepared.counts.ready,
    imported_row_count: prepared.counts.imported,
    duplicate_row_count: prepared.counts.duplicate,
    quarantined_row_count: prepared.counts.quarantined,
    failed_row_count: prepared.counts.failed,
    warning_issue_count: prepared.counts.warningIssues,
    error_issue_count: prepared.counts.errorIssues,
    rows: prepared.rows.map((row) => ({
      id: row.id,
      row_number: row.rowNumber,
      source_record_id: row.sourceRecordId,
      source_start_line: row.sourceStartLine,
      source_hash_sha256: row.sourceHash,
      normalized_hash_sha256: row.normalizedHash,
      normalized_data: row.normalizedData,
      prepared_disposition: row.preparedDisposition,
      prepared_matched_festival_id: row.preparedMatchedFestivalId,
      prepared_digest_sha256: row.preparedDigest,
      disposition: row.disposition,
      duplicate_of_row_id: row.duplicateOfRowId,
      matched_festival_id: row.matchedFestivalId,
      target_festival_id: null,
      issues: row.issues.map((issue) => ({ ...issue, safe_details: issue.safeDetails })),
    })),
    issues: [],
  };
  expect(festivalImportPreparedDigest(batch)).toBe(prepared.preparedDigest);
  return batch;
}

async function prepareWithMemory({ environment = "test", createResult = null } = {}) {
  let prepared;
  let batch;
  const repository = {
    findOperator: vi.fn(async (id) => ({ id, role: "admin" })),
    findBatchByChecksum: vi.fn(async () => null),
    findExistingCandidates: vi.fn(async () => new Map()),
    createPreparedBatch: vi.fn(async (input) => {
      prepared = input;
      batch = durable(input);
      return createResult?.(batch) ?? { created: true, batch };
    }),
  };
  const service = createFestivalImportService({ repository });
  const result = await service.prepare({ source, sourceName: "fixture.csv", expectedChecksum: festivalCsvChecksum(source), categoryMap, categoryMapBytes: mapBytes, environment, operatorUserId: "operator" });
  return { prepared, batch, repository, service, result };
}

const fileInput = { source, expectedChecksum: festivalCsvChecksum(source), categoryMap, categoryMapBytes: mapBytes };
const reviewNow = new Date("2026-08-05T12:00:00.000Z");

function signedApproval(batch, { privateKey, reviewerUserId = "reviewer", issuedAt = "2026-08-05T11:00:00.000Z", expiresAt = "2026-08-06T11:00:00.000Z", restoreVerifiedAt = "2026-08-05T10:00:00.000Z", backupChecksum = "a".repeat(64) } = {}) {
  const payload = {
    version: 1,
    reviewerUserId,
    batchId: batch.id,
    sourceChecksumSha256: batch.source_checksum_sha256,
    categoryMapChecksumSha256: batch.category_map_checksum_sha256,
    preparedEvidenceDigestSha256: batch.prepared_digest_sha256,
    environment: batch.environment,
    backup: {
      provider: "postgres-provider",
      artifactId: "backup-artifact-1",
      reference: "restricted-backup-reference",
      checksumSha256: backupChecksum,
      version: "provider-version-1",
    },
    restore: { testReference: "restore-test-1", verifiedAt: restoreVerifiedAt },
    issuedAt,
    expiresAt,
  };
  return {
    algorithm: "Ed25519",
    payload,
    signature: sign(null, festivalImportReviewApprovalSigningBytes(payload), privateKey).toString("base64"),
  };
}

describe("festival import service", () => {
  it("classifies duplicates only among otherwise importable rows", () => {
    const first = normalized(2, "Exact");
    const exact = { ...normalized(3, "Exact"), canonicalRowHash: first.canonicalRowHash, duplicateCandidateHash: first.duplicateCandidateHash };
    const conflictA = normalized(4, "Conflict", "A");
    const conflictB = normalized(5, "Conflict", "B");
    const invalidFirst = normalized(6, "No Category", "A", "");
    const invalidExact = { ...normalized(7, "No Category", "A", ""), canonicalRowHash: invalidFirst.canonicalRowHash, duplicateCandidateHash: invalidFirst.duplicateCandidateHash };
    const records = classifyFestivalImportRecords([first, exact, conflictA, conflictB, invalidFirst, invalidExact]);

    expect(records.map(({ disposition }) => disposition)).toEqual(["ready", "duplicate", "quarantined", "quarantined", "quarantined", "quarantined"]);
    expect(records[1].duplicateOfRecordNumber).toBe(2);
    expect(records.slice(2, 4).every(({ extraIssues }) => extraIssues[0].code === "conflicting_duplicate_candidate")).toBe(true);
    expect(records.slice(4).every(({ extraIssues }) => extraIssues[0].code === "missing_category")).toBe(true);
  });

  it("prepares redacted rows with bound deterministic evidence and no implicit review", async () => {
    const { prepared } = await prepareWithMemory();
    expect(prepared.counts).toMatchObject({ total: 5, ready: 2, duplicate: 1, quarantined: 2 });
    expect(JSON.stringify(prepared)).not.toContain("secret@example.test");
    expect(JSON.stringify(prepared)).not.toContain("Secret Person");
    expect(JSON.stringify(prepared)).not.toContain("215-555-0100");
    expect(prepared.profileName).toBe(`festival_csv_v1_${festivalCategoryMapChecksum(mapBytes)}`);
    expect(prepared.preparedDigest).toMatch(/^[a-f0-9]{64}$/u);
    expect(deterministicFestivalImportId(festivalCsvChecksum(source), "batch")).toBe(prepared.id);
    expect(prepared).not.toHaveProperty("reviewerUserId");
  });

  it("accepts a verified atomic prepare winner instead of surfacing a uniqueness race", async () => {
    const { result } = await prepareWithMemory({ createResult: (batch) => ({ created: false, batch }) });
    expect(result.noOp).toBe(true);
  });

  it("revalidates exact source and map before a completed replay no-op", async () => {
    const { batch } = await prepareWithMemory();
    batch.status = "completed";
    const repository = {
      findBatchById: vi.fn(async () => batch),
      findOperator: vi.fn(async () => ({ id: "operator", role: "super_admin" })),
      reconcile: vi.fn(async () => ({ ok: true })),
      claimApplyAttempt: vi.fn(),
    };
    const service = createFestivalImportService({ repository });
    const result = await service.apply({ ...fileInput, batchId: batch.id, environment: "test", operatorUserId: "operator" });
    expect(result.noOp).toBe(true);
    expect(repository.claimApplyAttempt).not.toHaveBeenCalled();
    const wrongSource = Buffer.from(source.toString("utf8").replace("One,1/2/2028", "Other,1/2/2028"));
    await expect(service.apply({ ...fileInput, source: wrongSource, expectedChecksum: undefined, batchId: batch.id, environment: "test", operatorUserId: "operator" })).rejects.toMatchObject({ code: "checksum_mismatch" });
    const wrongMap = { version: 1, categories: [{ slug: "music", aliases: ["Different"] }] };
    await expect(service.apply({ source, categoryMap: wrongMap, categoryMapBytes: Buffer.from(JSON.stringify(wrongMap)), batchId: batch.id, environment: "test", operatorUserId: "operator" })).rejects.toMatchObject({ code: "category_map_mismatch" });
  });

  it("derives a distinct production reviewer and recovery evidence from detached Ed25519 approval", async () => {
    const { publicKey, privateKey } = generateKeyPairSync("ed25519");
    const { batch } = await prepareWithMemory({ environment: "production" });
    const repository = {
      findOperator: vi.fn(async (id) => ({ id, role: "admin" })),
      findBatchById: vi.fn(async () => batch),
      recordReview: vi.fn(async (review) => Object.assign(batch, {
        reviewer_user_id: review.reviewerUserId,
        reviewed_at: review.reviewedAt,
        reviewed_source_checksum_sha256: review.sourceChecksum,
        reviewed_category_map_checksum_sha256: review.categoryMapChecksum,
        reviewed_prepared_digest_sha256: review.preparedDigest,
        reviewed_environment: review.environment,
        review_evidence_sha256: review.reviewEvidence,
        review_approval_sha256: review.approvalDigest,
        review_public_key_sha256: review.publicKeyDigest,
        review_issued_at: review.issuedAt,
        review_expires_at: review.expiresAt,
        backup_provider: review.backupProvider,
        backup_artifact_id: review.backupArtifactId,
        backup_reference: review.backupReference,
        backup_checksum_sha256: review.backupChecksum,
        backup_version: review.backupVersion,
        restore_reference: review.restoreReference,
        restore_verified_at: review.restoreVerifiedAt,
      })),
    };
    const service = createFestivalImportService({ repository, now: () => reviewNow });
    await expect(service.review({ ...fileInput, batchId: batch.id, environment: "production", testReviewerUserId: "reviewer", allowTestReviewer: true })).rejects.toMatchObject({ code: "signed_review_required" });
    await expect(service.review({ ...fileInput, batchId: batch.id, environment: "production", approval: signedApproval(batch, { privateKey, reviewerUserId: "operator" }), reviewPublicKey: publicKey })).rejects.toMatchObject({ code: "reviewer_must_be_distinct" });
    const approval = signedApproval(batch, { privateKey });
    const reviewed = await service.review({ ...fileInput, batchId: batch.id, environment: "production", approval, reviewPublicKey: publicKey });
    expect(reviewed.batch).toMatchObject({
      reviewer_user_id: "reviewer",
      reviewed_source_checksum_sha256: festivalCsvChecksum(source),
      backup_provider: "postgres-provider",
      backup_artifact_id: "backup-artifact-1",
      backup_version: "provider-version-1",
      restore_reference: "restore-test-1",
    });
    expect(reviewed.batch.review_evidence_sha256).toMatch(/^[a-f0-9]{64}$/u);
    const replay = await service.review({ ...fileInput, batchId: batch.id, environment: "production", approval, reviewPublicKey: publicKey });
    expect(replay.noOp).toBe(true);
    await expect(service.apply({ ...fileInput, batchId: batch.id, environment: "production", operatorUserId: "operator" })).rejects.toMatchObject({ code: "production_confirmation_required" });
  });

  it("rejects wrong signer, tampering, future restore evidence, and review replay mismatch", async () => {
    const signer = generateKeyPairSync("ed25519");
    const wrongSigner = generateKeyPairSync("ed25519");
    const { batch } = await prepareWithMemory({ environment: "production" });
    const repository = {
      findOperator: vi.fn(async (id) => ({ id, role: "admin" })),
      findBatchById: vi.fn(async () => batch),
      recordReview: vi.fn(async (review) => Object.assign(batch, {
        reviewer_user_id: review.reviewerUserId,
        reviewed_at: review.reviewedAt,
        reviewed_source_checksum_sha256: review.sourceChecksum,
        reviewed_category_map_checksum_sha256: review.categoryMapChecksum,
        reviewed_prepared_digest_sha256: review.preparedDigest,
        reviewed_environment: review.environment,
        review_evidence_sha256: review.reviewEvidence,
        review_approval_sha256: review.approvalDigest,
        review_public_key_sha256: review.publicKeyDigest,
        review_issued_at: review.issuedAt,
        review_expires_at: review.expiresAt,
        backup_provider: review.backupProvider,
        backup_artifact_id: review.backupArtifactId,
        backup_reference: review.backupReference,
        backup_checksum_sha256: review.backupChecksum,
        backup_version: review.backupVersion,
        restore_reference: review.restoreReference,
        restore_verified_at: review.restoreVerifiedAt,
      })),
    };
    const service = createFestivalImportService({ repository, now: () => reviewNow });
    const approval = signedApproval(batch, { privateKey: signer.privateKey });
    await expect(service.review({ ...fileInput, batchId: batch.id, environment: "production", approval, reviewPublicKey: wrongSigner.publicKey })).rejects.toMatchObject({ code: "invalid_review_signature" });
    const tampered = structuredClone(approval);
    tampered.payload.backup.reference = "tampered";
    await expect(service.review({ ...fileInput, batchId: batch.id, environment: "production", approval: tampered, reviewPublicKey: signer.publicKey })).rejects.toMatchObject({ code: "invalid_review_signature" });
    const future = signedApproval(batch, { privateKey: signer.privateKey, restoreVerifiedAt: "2026-08-06T12:00:00.000Z" });
    await expect(service.review({ ...fileInput, batchId: batch.id, environment: "production", approval: future, reviewPublicKey: signer.publicKey })).rejects.toMatchObject({ code: "future_restore_verification" });
    await service.review({ ...fileInput, batchId: batch.id, environment: "production", approval, reviewPublicKey: signer.publicKey });
    const mismatch = signedApproval(batch, { privateKey: signer.privateKey, backupChecksum: "b".repeat(64) });
    await expect(service.review({ ...fileInput, batchId: batch.id, environment: "production", approval: mismatch, reviewPublicKey: signer.publicKey })).rejects.toMatchObject({ code: "review_replay_mismatch" });
  });

  it("requires explicit resume for failed batches", async () => {
    const { batch } = await prepareWithMemory();
    batch.status = "failed";
    const repository = {
      findBatchById: vi.fn(async () => batch),
      findOperator: vi.fn(async () => ({ id: "operator", role: "admin" })),
    };
    await expect(createFestivalImportService({ repository }).apply({ ...fileInput, batchId: batch.id, environment: "test", operatorUserId: "operator" })).rejects.toMatchObject({ code: "resume_required" });
  });

  it("recovers only an expired running lease and fences every row with the new attempt token", async () => {
    const { batch } = await prepareWithMemory();
    batch.status = "running";
    batch.apply_attempt_token = "stale-token";
    batch.apply_attempt_expires_at = new Date("2026-08-05T11:00:00.000Z");
    const claimed = vi.fn();
    const imported = vi.fn();
    const completed = vi.fn(async () => ({ ...batch, status: "completed" }));
    const repository = {
      findBatchById: vi.fn(async () => batch),
      findOperator: vi.fn(async () => ({ id: "operator", role: "admin" })),
      claimApplyAttempt: claimed,
      importPreparedRow: imported,
      reconcile: vi.fn(async () => ({ ok: true, counts: { total: 5, ready: 0, imported: 2, duplicate: 1, quarantined: 2, failed: 0, warningIssues: 1, errorIssues: 2 } })),
      markCompleted: completed,
      markFailed: vi.fn(),
    };
    const service = createFestivalImportService({ repository, now: () => reviewNow, applyLeaseMs: 60_000 });
    const result = await service.apply({ ...fileInput, batchId: batch.id, environment: "test", operatorUserId: "operator", resume: true });
    expect(result.resumed).toBe(true);
    expect(claimed).toHaveBeenCalledWith(expect.objectContaining({ priorStatus: "running", resume: true }));
    const attemptToken = claimed.mock.calls[0][0].attemptToken;
    expect(imported).toHaveBeenCalled();
    expect(imported.mock.calls.every(([arguments_]) => arguments_.attemptToken === attemptToken)).toBe(true);
    expect(completed).toHaveBeenCalledWith(batch.id, expect.anything(), attemptToken, reviewNow);

    batch.apply_attempt_expires_at = new Date("2026-08-05T13:00:00.000Z");
    await expect(service.apply({ ...fileInput, batchId: batch.id, environment: "test", operatorUserId: "operator", resume: true })).rejects.toMatchObject({ code: "apply_attempt_active" });
  });

  it("recursively rejects sensitive key naming variants from all durable JSON evidence", () => {
    expect(() => assertRedactedImportValue({ nested: { contactEmail: "private@example.test" } })).toThrowError(expect.objectContaining({ code: "unsafe_contact_data" }));
    expect(() => assertRedactedImportValue({ details: { "raw-contact": "private" } })).toThrowError(expect.objectContaining({ code: "unsafe_contact_data" }));
    expect(assertRedactedImportValue({ nested: { issue_code: "safe" } })).toEqual({ nested: { issue_code: "safe" } });
  });

  it("persists only an allowlisted static failure when an exception contains private contact data", async () => {
    const { batch } = await prepareWithMemory();
    const persisted = vi.fn();
    const repository = {
      findBatchById: vi.fn(async () => batch),
      findOperator: vi.fn(async () => ({ id: "operator", role: "admin" })),
      claimApplyAttempt: vi.fn(),
      importPreparedRow: vi.fn(async () => { throw new Error("adapter failed for secret@example.test 215-555-0100"); }),
      reconcile: vi.fn(async () => ({ counts: { total: 5, ready: 2, imported: 0, duplicate: 1, quarantined: 2, failed: 0, warningIssues: 1, errorIssues: 2 } })),
      markFailed: persisted,
    };
    await expect(createFestivalImportService({ repository }).apply({ ...fileInput, batchId: batch.id, environment: "test", operatorUserId: "operator" })).rejects.toThrow();
    const failure = persisted.mock.calls[0][1];
    expect(failure).toEqual({ code: "apply_failed", message: "Festival import apply failed; inspect restricted operational diagnostics." });
    expect(JSON.stringify(failure)).not.toContain("secret@example.test");
  });

  it("fails closed on forbidden operators", async () => {
    const repository = { findBatchById: vi.fn(async () => ({ id: "batch", environment: "test", operator_user_id: "operator" })), findOperator: vi.fn(async () => ({ id: "operator", role: "producer" })) };
    await expect(createFestivalImportService({ repository }).apply({ batchId: "batch", environment: "test", operatorUserId: "operator" })).rejects.toBeInstanceOf(FestivalImportError);
    expect(FESTIVAL_IMPORT_PRODUCTION_CONFIRMATION).toBe("APPLY-FESTIVAL-IMPORT-PRODUCTION");
  });
});
