import { createHash, createPublicKey, randomUUID, verify as verifySignature } from "node:crypto";

import { parseFestivalCsv } from "./festival-import-csv.js";
import { validateFestivalCategoryMap } from "./festival-import-normalization.js";
import { festivalCsvChecksum, profileFestivalCsv } from "./festival-import-profile.js";

export const FESTIVAL_IMPORT_PROFILE_VERSION = 1;
export const FESTIVAL_IMPORT_ENVIRONMENTS = Object.freeze(["local", "test", "staging", "production"]);
export const FESTIVAL_IMPORT_OPERATOR_ROLES = Object.freeze(["admin", "super_admin"]);
export const FESTIVAL_IMPORT_PRODUCTION_CONFIRMATION = "APPLY-FESTIVAL-IMPORT-PRODUCTION";
export const FESTIVAL_IMPORT_APPLY_LEASE_MS = 5 * 60 * 1000;
export const FESTIVAL_IMPORT_APPROVAL_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
export const FESTIVAL_IMPORT_APPROVAL_CLOCK_SKEW_MS = 5 * 60 * 1000;

const PRIVATE_KEY_NAMES = new Set(["contactname", "contactemail", "contactphone", "submittedby", "rawcontact", "rawpayload"]);
const SAFE_FAILURES = Object.freeze({
  apply_failed: "Festival import apply failed; inspect restricted operational diagnostics.",
  category_not_found: "A prepared category is unavailable; no uncommitted row changes were retained.",
  reconciliation_failed: "Festival import reconciliation failed; the batch can be resumed after investigation.",
});

export class FestivalImportError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "FestivalImportError";
    this.code = code;
  }
}

function fail(code, message) {
  throw new FestivalImportError(code, message);
}

function sha256(input) {
  return createHash("sha256").update(input).digest("hex");
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function festivalCategoryMapChecksum(categoryMapInput) {
  const bytes = typeof categoryMapInput === "string" || categoryMapInput instanceof Uint8Array
    ? categoryMapInput
    : canonicalJson(categoryMapInput);
  return sha256(bytes);
}

export function festivalImportProfileName(categoryMapChecksum) {
  if (!/^[a-f0-9]{64}$/u.test(categoryMapChecksum)) throw new TypeError("Category map checksum must be a lowercase SHA-256 digest");
  return `festival_csv_v1_${categoryMapChecksum}`;
}

export function festivalImportSourceRowHash(record) {
  return sha256(canonicalJson(record.values));
}

export function deterministicFestivalImportId(sourceChecksum, identity) {
  const bytes = Buffer.from(sha256(`save-philly-festivals:${sourceChecksum}:${identity}`), "hex").subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function assertExactKeys(value, expected, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail("invalid_review_approval", `${label} must be an object`);
  const actual = Object.keys(value).sort();
  const required = [...expected].sort();
  if (actual.length !== required.length || actual.some((key, index) => key !== required[index])) {
    fail("invalid_review_approval", `${label} has an invalid field contract`);
  }
}

function boundedApprovalText(value, label, maximum = 1000) {
  if (typeof value !== "string" || !value.trim() || value.length > maximum) fail("invalid_review_approval", `${label} is invalid`);
  return value;
}

function validateReviewApprovalPayload(payload) {
  assertExactKeys(payload, [
    "version", "reviewerUserId", "batchId", "sourceChecksumSha256", "categoryMapChecksumSha256",
    "preparedEvidenceDigestSha256", "environment", "backup", "restore", "issuedAt", "expiresAt",
  ], "Approval payload");
  if (payload.version !== 1) fail("invalid_review_approval", "Approval payload version is unsupported");
  for (const [key, maximum] of [["reviewerUserId", 200], ["batchId", 200], ["environment", 50]]) boundedApprovalText(payload[key], key, maximum);
  for (const key of ["sourceChecksumSha256", "categoryMapChecksumSha256", "preparedEvidenceDigestSha256"]) {
    if (!/^[a-f0-9]{64}$/u.test(payload[key] ?? "")) fail("invalid_review_approval", `${key} must be a SHA-256 digest`);
  }
  assertExactKeys(payload.backup, ["provider", "artifactId", "reference", "checksumSha256", "version"], "Approval backup evidence");
  boundedApprovalText(payload.backup.provider, "backup.provider", 100);
  if (!/^[A-Za-z0-9._-]{1,100}$/u.test(payload.backup.provider)) fail("invalid_review_approval", "backup.provider is invalid");
  boundedApprovalText(payload.backup.artifactId, "backup.artifactId", 500);
  boundedApprovalText(payload.backup.reference, "backup.reference");
  if (!/^[a-f0-9]{64}$/u.test(payload.backup.checksumSha256 ?? "")) fail("invalid_review_approval", "backup.checksumSha256 must be a SHA-256 digest");
  boundedApprovalText(payload.backup.version, "backup.version", 200);
  assertExactKeys(payload.restore, ["testReference", "verifiedAt"], "Approval restore evidence");
  boundedApprovalText(payload.restore.testReference, "restore.testReference");
  boundedApprovalText(payload.restore.verifiedAt, "restore.verifiedAt", 100);
  boundedApprovalText(payload.issuedAt, "issuedAt", 100);
  boundedApprovalText(payload.expiresAt, "expiresAt", 100);
  return payload;
}

export function festivalImportReviewApprovalSigningBytes(payload) {
  return Buffer.from(canonicalJson(validateReviewApprovalPayload(payload)), "utf8");
}

export function verifyFestivalImportReviewApproval({ approval, publicKey, batch, now = new Date() }) {
  assertExactKeys(approval, ["algorithm", "payload", "signature"], "Detached approval");
  if (approval.algorithm !== "Ed25519") fail("invalid_review_approval", "Approval algorithm must be Ed25519");
  if (typeof approval.signature !== "string" || !/^[A-Za-z0-9+/]+={0,2}$/u.test(approval.signature)) fail("invalid_review_approval", "Approval signature is invalid");
  const payload = validateReviewApprovalPayload(approval.payload);
  let key;
  try {
    key = publicKey?.type === "public" ? publicKey : createPublicKey(publicKey);
  } catch {
    fail("invalid_review_public_key", "Configured review public key is invalid");
  }
  if (key.asymmetricKeyType !== "ed25519") fail("invalid_review_public_key", "Configured review public key must be Ed25519");
  const signature = Buffer.from(approval.signature, "base64");
  if (!verifySignature(null, festivalImportReviewApprovalSigningBytes(payload), key, signature)) fail("invalid_review_signature", "Detached reviewer approval signature is invalid");

  const current = now instanceof Date ? now : new Date(now);
  const issuedAt = new Date(payload.issuedAt);
  const expiresAt = new Date(payload.expiresAt);
  const restoreVerifiedAt = new Date(payload.restore.verifiedAt);
  if ([current, issuedAt, expiresAt, restoreVerifiedAt].some((value) => Number.isNaN(value.valueOf()))) fail("invalid_review_approval_time", "Approval timestamps are invalid");
  if (issuedAt.valueOf() > current.valueOf() + FESTIVAL_IMPORT_APPROVAL_CLOCK_SKEW_MS) fail("future_review_approval", "Reviewer approval was issued in the future");
  if (restoreVerifiedAt.valueOf() > current.valueOf() + FESTIVAL_IMPORT_APPROVAL_CLOCK_SKEW_MS) fail("future_restore_verification", "Restore verification timestamp is in the future");
  if (restoreVerifiedAt.valueOf() > issuedAt.valueOf() + FESTIVAL_IMPORT_APPROVAL_CLOCK_SKEW_MS) fail("restore_after_approval", "Restore verification must precede approval");
  if (current.valueOf() - issuedAt.valueOf() > FESTIVAL_IMPORT_APPROVAL_MAX_AGE_MS) fail("stale_review_approval", "Reviewer approval is stale");
  if (expiresAt.valueOf() <= current.valueOf()) fail("expired_review_approval", "Reviewer approval has expired");
  if (expiresAt.valueOf() <= issuedAt.valueOf() || expiresAt.valueOf() - issuedAt.valueOf() > FESTIVAL_IMPORT_APPROVAL_MAX_AGE_MS) {
    fail("invalid_review_approval_time", "Reviewer approval validity window is unreasonable");
  }
  if (batch && (payload.batchId !== batch.id
    || payload.sourceChecksumSha256 !== batch.source_checksum_sha256
    || payload.categoryMapChecksumSha256 !== batch.category_map_checksum_sha256
    || payload.preparedEvidenceDigestSha256 !== batch.prepared_digest_sha256
    || payload.environment !== batch.environment)) {
    fail("review_approval_binding_mismatch", "Reviewer approval does not match the prepared batch");
  }
  const publicKeyDer = key.export({ type: "spki", format: "der" });
  return Object.freeze({
    reviewerUserId: payload.reviewerUserId,
    backupProvider: payload.backup.provider,
    backupArtifactId: payload.backup.artifactId,
    backupReference: payload.backup.reference,
    backupChecksum: payload.backup.checksumSha256,
    backupVersion: payload.backup.version,
    restoreReference: payload.restore.testReference,
    restoreVerifiedAt,
    issuedAt,
    expiresAt,
    approvalDigest: sha256(canonicalJson(approval)),
    publicKeyDigest: sha256(publicKeyDer),
  });
}

function privateKeyName(key) {
  return String(key).replace(/[\s_.-]/gu, "").toLowerCase();
}

export function assertRedactedImportValue(value, path = "value") {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertRedactedImportValue(entry, `${path}[${index}]`));
  } else if (value && typeof value === "object") {
    for (const [key, entry] of Object.entries(value)) {
      if (PRIVATE_KEY_NAMES.has(privateKeyName(key))) fail("unsafe_contact_data", `Private contact data is forbidden in ${path}`);
      assertRedactedImportValue(entry, `${path}.${key}`);
    }
  }
  return value;
}

function issue(code, message, field = null) {
  return Object.freeze({ severity: "error", code, field, message, safeDetails: null });
}

export function classifyFestivalImportRecords(normalizedRecords, existingCandidates = new Map()) {
  const results = new Map();
  const importable = [];
  for (const record of normalizedRecords) {
    if (record.disposition !== "ready") {
      results.set(record.recordNumber, {
        disposition: "quarantined", duplicateOfRecordNumber: null, matchedFestivalId: null, extraIssues: [],
      });
    } else if (!record.applyPayload.category_slug) {
      results.set(record.recordNumber, {
        disposition: "quarantined",
        duplicateOfRecordNumber: null,
        matchedFestivalId: null,
        extraIssues: [issue("missing_category", "An approved category is required for import")],
      });
    } else {
      results.set(record.recordNumber, {
        disposition: "ready", duplicateOfRecordNumber: null, matchedFestivalId: null, extraIssues: [],
      });
      importable.push(record);
    }
  }

  const groups = new Map();
  for (const record of importable) {
    const group = groups.get(record.duplicateCandidateHash) ?? [];
    group.push(record);
    groups.set(record.duplicateCandidateHash, group);
  }
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const hashes = new Set(group.map(({ canonicalRowHash }) => canonicalRowHash));
    if (hashes.size > 1) {
      for (const record of group) {
        results.set(record.recordNumber, {
          disposition: "quarantined",
          duplicateOfRecordNumber: null,
          matchedFestivalId: null,
          extraIssues: [issue("conflicting_duplicate_candidate", "All same-name/date candidates were quarantined because material fields differ")],
        });
      }
      continue;
    }
    const first = group[0];
    for (const record of group.slice(1)) {
      results.set(record.recordNumber, {
        disposition: "duplicate",
        duplicateOfRecordNumber: first.recordNumber,
        matchedFestivalId: null,
        extraIssues: [{ severity: "warning", code: "exact_source_duplicate", field: null, message: "Exact importable duplicate linked to the first source row", safeDetails: null }],
      });
    }
  }

  return normalizedRecords.map((record) => {
    const result = results.get(record.recordNumber);
    const existing = existingCandidates.get(record.recordNumber);
    if (result.disposition === "ready" && existing) {
      return Object.freeze({
        ...record,
        disposition: "quarantined",
        duplicateOfRecordNumber: null,
        matchedFestivalId: existing.id,
        extraIssues: [issue("existing_target_candidate", "A conservative existing-target match requires editorial review")],
      });
    }
    return Object.freeze({ ...record, ...result });
  });
}

function countsFor(records) {
  const counts = { total: records.length, ready: 0, imported: 0, duplicate: 0, quarantined: 0, failed: 0, warningIssues: 0, errorIssues: 0 };
  for (const record of records) {
    counts[record.disposition] += 1;
    for (const current of [...record.errors, ...record.warnings, ...record.extraIssues]) {
      counts[current.severity === "error" || record.errors.includes(current) ? "errorIssues" : "warningIssues"] += 1;
    }
  }
  return counts;
}

function digestCounts(input) {
  return {
    total: input.total ?? input.total_row_count,
    ready: input.ready ?? input.ready_row_count,
    imported: input.imported ?? input.imported_row_count,
    duplicate: input.duplicate ?? input.duplicate_row_count,
    quarantined: input.quarantined ?? input.quarantined_row_count,
    failed: input.failed ?? input.failed_row_count,
    warningIssues: input.warningIssues ?? input.warning_issue_count,
    errorIssues: input.errorIssues ?? input.error_issue_count,
  };
}

function digestRow(row) {
  const issues = row.issues ?? [];
  return {
    id: row.id,
    rowNumber: row.rowNumber ?? row.row_number,
    sourceRecordId: row.sourceRecordId ?? row.source_record_id,
    sourceStartLine: row.sourceStartLine ?? row.source_start_line,
    sourceHash: row.sourceHash ?? row.source_hash_sha256,
    normalizedHash: row.normalizedHash ?? row.normalized_hash_sha256,
    normalizedData: row.normalizedData ?? row.normalized_data,
    disposition: row.disposition,
    duplicateOfRowId: row.duplicateOfRowId ?? row.duplicate_of_row_id ?? null,
    matchedFestivalId: row.matchedFestivalId ?? row.matched_festival_id ?? null,
    issues: issues.map((current) => ({
      severity: current.severity,
      code: current.code,
      field: current.field ?? null,
      message: current.message,
      safeDetails: current.safeDetails ?? current.safe_details ?? null,
    })).sort((left, right) => canonicalJson(left).localeCompare(canonicalJson(right))),
  };
}

function festivalImportPreparedRowDigest(row) {
  return sha256(canonicalJson(digestRow(row)));
}

export function festivalImportPreparedDigest(input) {
  const rows = [...(input.rows ?? [])].map((row) => ({
    id: row.id,
    rowNumber: row.rowNumber ?? row.row_number,
    preparedDigest: row.preparedDigest ?? row.prepared_digest_sha256 ?? festivalImportPreparedRowDigest(row),
  })).sort((left, right) => left.rowNumber - right.rowNumber);
  return sha256(canonicalJson({
    sourceChecksum: input.sourceChecksum ?? input.source_checksum_sha256,
    categoryMapChecksum: input.categoryMapChecksum ?? input.category_map_checksum_sha256,
    profileName: input.profileName ?? input.import_profile,
    profileVersion: input.profileVersion ?? input.import_profile_version,
    environment: input.environment,
    operatorUserId: input.operatorUserId ?? input.operator_user_id,
    counts: digestCounts(input.preparedCounts ?? input.prepared_counts ?? input.counts ?? input),
    rows,
  }));
}

export function festivalImportReviewEvidenceDigest({
  batch, approvalDigest = null, publicKeyDigest = null, issuedAt = null, expiresAt = null,
  backupProvider = null, backupArtifactId = null, backupReference = null, backupChecksum = null,
  backupVersion = null, restoreReference = null, restoreVerifiedAt = null,
}) {
  return sha256(canonicalJson({
    batchId: batch.id,
    sourceChecksum: batch.source_checksum_sha256,
    categoryMapChecksum: batch.category_map_checksum_sha256,
    preparedDigest: batch.prepared_digest_sha256,
    environment: batch.environment,
    approvalDigest,
    publicKeyDigest,
    issuedAt: issuedAt instanceof Date ? issuedAt.toISOString() : issuedAt,
    expiresAt: expiresAt instanceof Date ? expiresAt.toISOString() : expiresAt,
    backupProvider,
    backupArtifactId,
    backupReference,
    backupChecksum,
    backupVersion,
    restoreReference,
    restoreVerifiedAt: restoreVerifiedAt instanceof Date ? restoreVerifiedAt.toISOString() : restoreVerifiedAt,
  }));
}

function assertEnvironment(environment) {
  if (!FESTIVAL_IMPORT_ENVIRONMENTS.includes(environment)) fail("invalid_environment", `Environment must be one of: ${FESTIVAL_IMPORT_ENVIRONMENTS.join(", ")}`);
}

function assertOperator(operator) {
  if (!operator || !FESTIVAL_IMPORT_OPERATOR_ROLES.includes(operator.role)) fail("operator_forbidden", "Festival imports require an admin or super_admin operator");
}

function assertPreparedBinding(batch, analyzed, environment) {
  if (batch.environment !== environment) fail("environment_mismatch", "Operation environment does not match the prepared batch");
  if (analyzed.sourceChecksum !== batch.source_checksum_sha256) fail("checksum_mismatch", "Input file does not match the prepared batch");
  if (analyzed.categoryMapChecksum !== batch.category_map_checksum_sha256
    || festivalImportProfileName(analyzed.categoryMapChecksum) !== batch.import_profile) {
    fail("category_map_mismatch", "Category map does not match the prepared batch");
  }
  if (festivalImportPreparedDigest(batch) !== batch.prepared_digest_sha256) {
    fail("prepared_digest_mismatch", "Durable prepared evidence does not match its bound digest");
  }
}

function assertProductionPrerequisites(batch, options) {
  if (batch.environment !== "production") return;
  if (!batch.reviewer_user_id || !batch.reviewed_at || batch.reviewer_user_id === batch.operator_user_id
    || batch.reviewed_source_checksum_sha256 !== batch.source_checksum_sha256
    || batch.reviewed_category_map_checksum_sha256 !== batch.category_map_checksum_sha256
    || batch.reviewed_prepared_digest_sha256 !== batch.prepared_digest_sha256
    || batch.reviewed_environment !== batch.environment
    || !batch.review_evidence_sha256 || !batch.review_approval_sha256 || !batch.review_public_key_sha256
    || !batch.review_issued_at || !batch.review_expires_at) {
    fail("production_review_required", "Production apply requires immutable approval by a distinct reviewer");
  }
  if (!batch.backup_provider || !batch.backup_artifact_id || !batch.backup_reference || !batch.backup_checksum_sha256
    || !batch.backup_version || !batch.restore_reference || !batch.restore_verified_at) {
    fail("production_backup_required", "Production apply requires reviewed backup and restore-verification evidence");
  }
  const expectedReviewEvidence = festivalImportReviewEvidenceDigest({
    batch,
    approvalDigest: batch.review_approval_sha256,
    publicKeyDigest: batch.review_public_key_sha256,
    issuedAt: batch.review_issued_at,
    expiresAt: batch.review_expires_at,
    backupProvider: batch.backup_provider,
    backupArtifactId: batch.backup_artifact_id,
    backupReference: batch.backup_reference,
    backupChecksum: batch.backup_checksum_sha256,
    backupVersion: batch.backup_version,
    restoreReference: batch.restore_reference,
    restoreVerifiedAt: batch.restore_verified_at,
  });
  if (expectedReviewEvidence !== batch.review_evidence_sha256) fail("production_review_evidence_mismatch", "Production review evidence does not match the approved batch");
  const current = options.now instanceof Date ? options.now : new Date(options.now ?? Date.now());
  if (!options.allowExpiredApproval && new Date(batch.review_expires_at).valueOf() <= current.valueOf()) fail("expired_review_approval", "Production reviewer approval has expired");
  if (options.confirmation !== FESTIVAL_IMPORT_PRODUCTION_CONFIRMATION) fail("production_confirmation_required", `Production apply requires confirmation ${FESTIVAL_IMPORT_PRODUCTION_CONFIRMATION}`);
}

function safeFailure(error) {
  const code = Object.hasOwn(SAFE_FAILURES, error?.code) ? error.code : "apply_failed";
  return { code, message: SAFE_FAILURES[code] };
}

export function createFestivalImportService({ repository, now = () => new Date(), applyLeaseMs = FESTIVAL_IMPORT_APPLY_LEASE_MS }) {
  if (!repository) throw new TypeError("A festival import repository is required");
  if (typeof now !== "function") throw new TypeError("Festival import clock must be a function");
  if (!Number.isSafeInteger(applyLeaseMs) || applyLeaseMs < 1000) throw new TypeError("Festival import apply lease must be at least one second");

  async function analyze({ source, categoryMap, categoryMapBytes, expectedChecksum }) {
    validateFestivalCategoryMap(categoryMap);
    const sourceChecksum = festivalCsvChecksum(source);
    if (expectedChecksum && sourceChecksum !== expectedChecksum) fail("checksum_mismatch", "Festival CSV checksum does not match the expected digest");
    const categoryMapChecksum = festivalCategoryMapChecksum(categoryMapBytes ?? categoryMap);
    const profile = profileFestivalCsv(source, { categoryMap, expectedChecksum: sourceChecksum });
    const parsed = parseFestivalCsv(source);
    return { sourceChecksum, categoryMapChecksum, profile, parsed };
  }

  function verifyPreparedRows(batch, analyzed) {
    const normalizedByNumber = new Map(analyzed.profile.normalizedRecords.map((record) => [record.recordNumber, record]));
    const sourceByNumber = new Map(analyzed.parsed.records.map((record) => [record.recordNumber, record]));
    for (const row of batch.rows) {
      const normalized = normalizedByNumber.get(row.row_number);
      const sourceRecord = sourceByNumber.get(row.row_number);
      if (!normalized || normalized.canonicalRowHash !== row.normalized_hash_sha256
        || !sourceRecord || festivalImportSourceRowHash(sourceRecord) !== row.source_hash_sha256) {
        fail("prepared_row_mismatch", `Prepared evidence does not match source record ${row.row_number}`);
      }
    }
    return normalizedByNumber;
  }

  function verifyPreparedWinner(batch, prepared) {
    if (!batch || batch.source_checksum_sha256 !== prepared.sourceChecksum
      || batch.category_map_checksum_sha256 !== prepared.categoryMapChecksum
      || batch.prepared_digest_sha256 !== prepared.preparedDigest
      || batch.import_profile !== prepared.profileName
      || batch.import_profile_version !== prepared.profileVersion
      || batch.environment !== prepared.environment
      || batch.operator_user_id !== prepared.operatorUserId) {
      fail("prepared_batch_conflict", "An existing source batch has different immutable prepared evidence");
    }
  }

  return Object.freeze({
    async dryRun(input) {
      const analyzed = await analyze(input);
      const existing = input.detectExisting === false ? new Map() : await repository.findExistingCandidates(analyzed.profile.normalizedRecords);
      const records = classifyFestivalImportRecords(analyzed.profile.normalizedRecords, existing);
      return Object.freeze({ mode: "dry-run", sourceChecksum: analyzed.sourceChecksum, categoryMapChecksum: analyzed.categoryMapChecksum, counts: countsFor(records), records });
    },

    async prepare(input) {
      assertEnvironment(input.environment);
      const operator = await repository.findOperator(input.operatorUserId);
      assertOperator(operator);
      const analyzed = await analyze(input);
      const profileName = festivalImportProfileName(analyzed.categoryMapChecksum);
      const existingBatch = await repository.findBatchByChecksum(analyzed.sourceChecksum);
      if (existingBatch) {
        if (existingBatch.category_map_checksum_sha256 !== analyzed.categoryMapChecksum
          || existingBatch.import_profile !== profileName
          || existingBatch.import_profile_version !== FESTIVAL_IMPORT_PROFILE_VERSION
          || existingBatch.environment !== input.environment
          || existingBatch.operator_user_id !== operator.id
          || festivalImportPreparedDigest(existingBatch) !== existingBatch.prepared_digest_sha256) {
          fail("prepared_batch_conflict", "An existing source batch has different immutable prepared evidence");
        }
        return { mode: "prepare", noOp: true, batch: existingBatch };
      }
      const existingTargets = await repository.findExistingCandidates(analyzed.profile.normalizedRecords);
      const records = classifyFestivalImportRecords(analyzed.profile.normalizedRecords, existingTargets);
      const sourceByNumber = new Map(analyzed.parsed.records.map((record) => [record.recordNumber, record]));
      const batchId = deterministicFestivalImportId(analyzed.sourceChecksum, "batch");
      const rowIds = new Map(records.map((record) => [record.recordNumber, deterministicFestivalImportId(analyzed.sourceChecksum, `row:${record.recordNumber}`)]));
      const prepared = {
        id: batchId,
        sourceName: input.sourceName,
        sourceChecksum: analyzed.sourceChecksum,
        categoryMapChecksum: analyzed.categoryMapChecksum,
        profileName,
        profileVersion: FESTIVAL_IMPORT_PROFILE_VERSION,
        environment: input.environment,
        operatorUserId: operator.id,
        counts: countsFor(records),
        rows: records.map((record) => ({
          id: rowIds.get(record.recordNumber),
          rowNumber: record.recordNumber,
          sourceRecordId: `csv-record-${record.recordNumber}`,
          sourceStartLine: record.startLine,
          sourceHash: festivalImportSourceRowHash(sourceByNumber.get(record.recordNumber)),
          normalizedHash: record.canonicalRowHash,
          normalizedData: assertRedactedImportValue(record.redactedPayload),
          disposition: record.disposition,
          duplicateOfRowId: record.duplicateOfRecordNumber ? rowIds.get(record.duplicateOfRecordNumber) : null,
          matchedFestivalId: record.matchedFestivalId,
          issues: [
            ...record.errors.map((entry) => ({ ...entry, severity: "error", safeDetails: assertRedactedImportValue(entry.safeDetails ?? null) })),
            ...record.warnings.map((entry) => ({ ...entry, severity: "warning", safeDetails: assertRedactedImportValue(entry.safeDetails ?? null) })),
            ...record.extraIssues.map((entry) => ({ ...entry, safeDetails: assertRedactedImportValue(entry.safeDetails ?? null) })),
          ],
        })),
      };
      prepared.preparedCounts = prepared.counts;
      prepared.rows = prepared.rows.map((row) => ({
        ...row,
        preparedDisposition: row.disposition,
        preparedMatchedFestivalId: row.matchedFestivalId,
        preparedDigest: festivalImportPreparedRowDigest(row),
      }));
      prepared.preparedDigest = festivalImportPreparedDigest(prepared);

      const created = await repository.createPreparedBatch(prepared);
      const batch = created.batch ?? created;
      const wasCreated = created.created ?? true;
      if (!wasCreated) verifyPreparedWinner(batch, prepared);
      return { mode: "prepare", noOp: !wasCreated, batch };
    },

    async review(input) {
      assertEnvironment(input.environment);
      const batch = await repository.findBatchById(input.batchId);
      if (!batch) fail("batch_not_found", "Prepared festival import batch was not found");
      if (batch.status !== "prepared") fail("batch_not_reviewable", `Batch status must be prepared, not ${batch.status}`);
      const analyzed = await analyze(input);
      assertPreparedBinding(batch, analyzed, input.environment);
      verifyPreparedRows(batch, analyzed);

      let approvalEvidence;
      if (input.approval || input.reviewPublicKey) {
        if (!input.approval || !input.reviewPublicKey) fail("signed_review_required", "Detached approval and configured public key are both required");
        approvalEvidence = verifyFestivalImportReviewApproval({ approval: input.approval, publicKey: input.reviewPublicKey, batch, now: now() });
      } else {
        if (batch.environment === "production") fail("signed_review_required", "Production review requires detached Ed25519 approval");
        if (!input.allowTestReviewer || !["local", "test"].includes(batch.environment) || !input.testReviewerUserId) {
          fail("signed_review_required", "Review requires detached approval or the explicit local/test reviewer path");
        }
        approvalEvidence = {
          reviewerUserId: input.testReviewerUserId,
          approvalDigest: null,
          publicKeyDigest: null,
          issuedAt: null,
          expiresAt: null,
          backupProvider: null,
          backupArtifactId: null,
          backupReference: null,
          backupChecksum: null,
          backupVersion: null,
          restoreReference: null,
          restoreVerifiedAt: null,
        };
      }

      const reviewer = await repository.findOperator(approvalEvidence.reviewerUserId);
      assertOperator(reviewer);
      if (reviewer.id === batch.operator_user_id) fail("reviewer_must_be_distinct", "Reviewer must be distinct from the import operator");
      const reviewEvidence = festivalImportReviewEvidenceDigest({ batch, ...approvalEvidence });
      if (batch.reviewer_user_id) {
        if (batch.reviewer_user_id !== reviewer.id || batch.review_evidence_sha256 !== reviewEvidence) {
          fail("review_replay_mismatch", "Review replay does not match the immutable approval evidence");
        }
        return { mode: "review", noOp: true, batch };
      }

      const reviewed = await repository.recordReview({
        batchId: batch.id,
        reviewerUserId: reviewer.id,
        reviewedAt: now(),
        sourceChecksum: batch.source_checksum_sha256,
        categoryMapChecksum: batch.category_map_checksum_sha256,
        preparedDigest: batch.prepared_digest_sha256,
        environment: batch.environment,
        reviewEvidence,
        ...approvalEvidence,
      });
      return { mode: "review", noOp: false, batch: reviewed };
    },

    async apply(input) {
      assertEnvironment(input.environment);
      const batch = await repository.findBatchById(input.batchId);
      if (!batch) fail("batch_not_found", "Prepared festival import batch was not found");
      const operator = await repository.findOperator(input.operatorUserId);
      assertOperator(operator);
      if (operator.id !== batch.operator_user_id) fail("operator_mismatch", "Apply operator must match the prepared batch operator");

      const analyzed = await analyze(input);
      assertPreparedBinding(batch, analyzed, input.environment);
      const normalizedByNumber = verifyPreparedRows(batch, analyzed);
      const operationNow = now();
      assertProductionPrerequisites(batch, { ...input, now: operationNow, allowExpiredApproval: batch.status === "completed" });

      if (batch.status === "completed") return { mode: "apply", noOp: true, batch, reconciliation: await repository.reconcile(batch.id) };
      if (["failed", "running"].includes(batch.status) && !input.resume) fail("resume_required", "Failed or interrupted batches require an explicit resume operation");
      if (batch.status === "running" && (!batch.apply_attempt_expires_at || new Date(batch.apply_attempt_expires_at).valueOf() > operationNow.valueOf())) {
        fail("apply_attempt_active", "The current apply attempt lease has not expired");
      }
      if (!["prepared", "failed", "running"].includes(batch.status)) fail("batch_not_prepared", `Batch status cannot be applied: ${batch.status}`);

      const attemptToken = randomUUID();
      const attemptExpiresAt = new Date(operationNow.valueOf() + applyLeaseMs);
      await repository.claimApplyAttempt({
        batchId: batch.id,
        priorStatus: batch.status,
        resume: input.resume === true,
        attemptToken,
        claimedAt: operationNow,
        expiresAt: attemptExpiresAt,
      });
      try {
        for (const row of batch.rows.filter(({ disposition }) => disposition === "ready")) {
          const heartbeatAt = now();
          await repository.importPreparedRow({
            batchId: batch.id,
            row,
            payload: normalizedByNumber.get(row.row_number).applyPayload,
            operatorUserId: operator.id,
            festivalId: deterministicFestivalImportId(batch.source_checksum_sha256, `festival:${row.row_number}`),
            occurrenceId: deterministicFestivalImportId(batch.source_checksum_sha256, `occurrence:${row.row_number}`),
            transitionId: deterministicFestivalImportId(batch.source_checksum_sha256, `transition:${row.row_number}`),
            revisionId: deterministicFestivalImportId(batch.source_checksum_sha256, `revision:${row.row_number}`),
            attemptToken,
            heartbeatAt,
            attemptExpiresAt: new Date(heartbeatAt.valueOf() + applyLeaseMs),
          });
        }
        const reconciliation = await repository.reconcile(batch.id);
        if (!reconciliation.ok) fail("reconciliation_failed", SAFE_FAILURES.reconciliation_failed);
        const completed = await repository.markCompleted(batch.id, reconciliation.counts, attemptToken, now());
        return { mode: "apply", noOp: false, resumed: batch.status !== "prepared", batch: completed, reconciliation };
      } catch (error) {
        let counts;
        try { counts = (await repository.reconcile(batch.id)).counts; } catch { counts = null; }
        await repository.markFailed(batch.id, safeFailure(error), counts, attemptToken, now());
        throw error;
      }
    },

    async report({ batchId }) {
      const batch = await repository.findBatchById(batchId);
      if (!batch) fail("batch_not_found", "Festival import batch was not found");
      return { mode: "report", batch, reconciliation: await repository.reconcile(batchId) };
    },
  });
}
