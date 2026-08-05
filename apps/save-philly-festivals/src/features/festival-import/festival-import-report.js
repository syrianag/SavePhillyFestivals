const REPORT_VERSION = 1;

function sortedCounts(rows, property) {
  const counts = {};
  for (const row of rows ?? []) {
    const key = row[property];
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
}

function issueCodeCounts(batch) {
  const counts = {};
  for (const issue of [
    ...(batch.issues ?? []),
    ...(batch.rows ?? []).flatMap((row) => row.issues ?? []),
  ]) {
    const key = `${issue.severity}:${issue.code}`;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
}

export function createFestivalImportReport({ batch, reconciliation }) {
  if (!batch) throw new TypeError("A festival import batch is required");
  const rows = (batch.rows ?? []).map((row) => Object.freeze({
    rowNumber: row.row_number,
    sourceStartLine: row.source_start_line,
    disposition: row.disposition,
    issueCodes: Object.freeze((row.issues ?? []).map(({ severity, code }) => `${severity}:${code}`).sort()),
    hasTarget: Boolean(row.target_festival_id),
    duplicateOfRowNumber: row.duplicate_of_row?.row_number ?? null,
    hasExistingTargetCandidate: Boolean(row.matched_festival_id),
  }));
  return Object.freeze({
    reportVersion: REPORT_VERSION,
    batch: Object.freeze({
      id: batch.id,
      sourceName: batch.source_name,
      sourceChecksumSha256: batch.source_checksum_sha256,
      categoryMapChecksumSha256: batch.category_map_checksum_sha256 ?? batch.import_profile?.replace(/^festival_csv_v1_/u, "") ?? null,
      preparedDigestSha256: batch.prepared_digest_sha256 ?? null,
      reviewEvidenceSha256: batch.review_evidence_sha256 ?? null,
      environment: batch.environment,
      status: batch.status,
      operatorUserId: batch.operator_user_id,
      reviewerRecorded: Boolean(batch.reviewer_user_id && batch.reviewed_at),
      signedApprovalRecorded: Boolean(batch.review_approval_sha256 && batch.review_public_key_sha256),
      backupEvidenceRecorded: Boolean(batch.backup_provider && batch.backup_artifact_id && batch.backup_reference && batch.backup_checksum_sha256 && batch.backup_version),
      restoreEvidenceRecorded: Boolean(batch.restore_reference && batch.restore_verified_at),
      startedAt: batch.started_at?.toISOString?.() ?? batch.started_at ?? null,
      completedAt: batch.completed_at?.toISOString?.() ?? batch.completed_at ?? null,
    }),
    counts: Object.freeze({
      total: batch.total_row_count,
      ready: batch.ready_row_count,
      imported: batch.imported_row_count,
      duplicate: batch.duplicate_row_count,
      quarantined: batch.quarantined_row_count,
      failed: batch.failed_row_count,
      warnings: batch.warning_issue_count,
      errors: batch.error_issue_count,
      byDisposition: sortedCounts(batch.rows, "disposition"),
      byIssueCode: issueCodeCounts(batch),
    }),
    reconciliation: reconciliation ? Object.freeze({
      ok: reconciliation.ok,
      checks: reconciliation.checks,
      sideEffectCount: reconciliation.sideEffectCount,
    }) : null,
    rows: Object.freeze(rows),
  });
}

export function formatFestivalImportReport(input, { format = "json" } = {}) {
  const report = input?.reportVersion === REPORT_VERSION ? input : createFestivalImportReport(input);
  if (format === "json") return `${JSON.stringify(report, null, 2)}\n`;
  if (format !== "csv") throw new TypeError("Festival import report format must be json or csv");
  const escape = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const lines = ["row_number,source_start_line,disposition,issue_codes,has_target,duplicate_of_row_number,has_existing_target_candidate"];
  for (const row of report.rows) {
    lines.push([
      row.rowNumber,
      row.sourceStartLine,
      row.disposition,
      row.issueCodes.join("|"),
      row.hasTarget,
      row.duplicateOfRowNumber,
      row.hasExistingTargetCandidate,
    ].map(escape).join(","));
  }
  return `${lines.join("\n")}\n`;
}
