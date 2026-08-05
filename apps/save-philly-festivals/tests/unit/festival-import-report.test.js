import { describe, expect, it } from "vitest";

import { createFestivalImportReport, formatFestivalImportReport } from "@/features/festival-import/festival-import-report";

const batch = {
  id: "batch-1",
  source_name: "fixture.csv",
  source_checksum_sha256: "a".repeat(64),
  import_profile: `festival_csv_v1_${"b".repeat(64)}`,
  environment: "test",
  status: "completed",
  operator_user_id: "operator-1",
  reviewer_user_id: null,
  reviewed_at: null,
  backup_reference: null,
  backup_checksum_sha256: null,
  total_row_count: 2,
  ready_row_count: 0,
  imported_row_count: 1,
  duplicate_row_count: 0,
  quarantined_row_count: 1,
  failed_row_count: 0,
  warning_issue_count: 0,
  error_issue_count: 1,
  rows: [
    { row_number: 2, source_start_line: 2, disposition: "imported", target_festival_id: "festival-1", matched_festival_id: null, issues: [], normalized_data: { contact_email: "must never be copied" } },
    { row_number: 3, source_start_line: 3, disposition: "quarantined", target_festival_id: null, matched_festival_id: null, issues: [{ severity: "error", code: "invalid_start_date", message: "unsafe@example.test" }] },
  ],
  issues: [],
};

describe("festival import report", () => {
  it("emits checksums, dispositions, and issue codes without payloads, messages, or contact values", () => {
    const report = createFestivalImportReport({ batch, reconciliation: { ok: true, checks: { noSideEffects: true }, sideEffectCount: 0 } });
    const json = formatFestivalImportReport(report);
    expect(report.batch.categoryMapChecksumSha256).toBe("b".repeat(64));
    expect(report.counts.byIssueCode).toEqual({ "error:invalid_start_date": 1 });
    expect(json).not.toContain("must never be copied");
    expect(json).not.toContain("unsafe@example.test");
    expect(json).not.toContain("normalized_data");
  });

  it("formats a redacted review CSV", () => {
    const csv = formatFestivalImportReport(createFestivalImportReport({ batch }), { format: "csv" });
    expect(csv).toContain("row_number,source_start_line,disposition,issue_codes");
    expect(csv).toContain("error:invalid_start_date");
    expect(csv).not.toContain("@");
  });
});
