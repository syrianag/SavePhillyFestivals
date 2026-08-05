-- Festival data-import lineage only. Source contact payloads are deliberately excluded:
-- rows retain hashes and a redacted normalized object, while issues retain safe details.

CREATE TYPE "FestivalImportBatchStatus" AS ENUM ('prepared', 'running', 'completed', 'failed', 'rolled_back');
CREATE TYPE "FestivalImportRowDisposition" AS ENUM ('ready', 'imported', 'duplicate', 'quarantined', 'failed');
CREATE TYPE "FestivalImportIssueSeverity" AS ENUM ('warning', 'error');

CREATE TABLE "FestivalImportBatch" (
  "id" TEXT NOT NULL,
  "source_name" TEXT NOT NULL,
  "source_checksum_sha256" TEXT NOT NULL,
  "category_map_checksum_sha256" TEXT NOT NULL,
  "prepared_digest_sha256" TEXT NOT NULL,
  "prepared_counts" JSONB NOT NULL,
  "import_profile" TEXT NOT NULL,
  "import_profile_version" INTEGER NOT NULL,
  "environment" TEXT NOT NULL,
  "operator_user_id" TEXT NOT NULL,
  "reviewer_user_id" TEXT,
  "reviewed_at" TIMESTAMP(3),
  "reviewed_source_checksum_sha256" TEXT,
  "reviewed_category_map_checksum_sha256" TEXT,
  "reviewed_prepared_digest_sha256" TEXT,
  "reviewed_environment" TEXT,
  "review_evidence_sha256" TEXT,
  "review_approval_sha256" TEXT,
  "review_public_key_sha256" TEXT,
  "review_issued_at" TIMESTAMP(3),
  "review_expires_at" TIMESTAMP(3),
  "backup_provider" TEXT,
  "backup_artifact_id" TEXT,
  "backup_reference" TEXT,
  "backup_checksum_sha256" TEXT,
  "backup_version" TEXT,
  "restore_reference" TEXT,
  "restore_verified_at" TIMESTAMP(3),
  "backup_override_reason" TEXT,
  "backup_overridden_by_user_id" TEXT,
  "backup_overridden_at" TIMESTAMP(3),
  "total_row_count" INTEGER NOT NULL DEFAULT 0,
  "ready_row_count" INTEGER NOT NULL DEFAULT 0,
  "imported_row_count" INTEGER NOT NULL DEFAULT 0,
  "duplicate_row_count" INTEGER NOT NULL DEFAULT 0,
  "quarantined_row_count" INTEGER NOT NULL DEFAULT 0,
  "failed_row_count" INTEGER NOT NULL DEFAULT 0,
  "warning_issue_count" INTEGER NOT NULL DEFAULT 0,
  "error_issue_count" INTEGER NOT NULL DEFAULT 0,
  "status" "FestivalImportBatchStatus" NOT NULL DEFAULT 'prepared',
  "failure_code" TEXT,
  "failure_message" TEXT,
  "started_at" TIMESTAMP(3),
  "completed_at" TIMESTAMP(3),
  "apply_attempt_token" TEXT,
  "apply_attempt_started_at" TIMESTAMP(3),
  "apply_attempt_heartbeat_at" TIMESTAMP(3),
  "apply_attempt_expires_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FestivalImportBatch_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FestivalImportBatch_source_name_bounded" CHECK (char_length("source_name") BETWEEN 1 AND 500),
  CONSTRAINT "FestivalImportBatch_source_checksum_sha256_format" CHECK ("source_checksum_sha256" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "FestivalImportBatch_bound_digests_format" CHECK (
    "category_map_checksum_sha256" ~ '^[0-9a-f]{64}$' AND "prepared_digest_sha256" ~ '^[0-9a-f]{64}$'
  ),
  CONSTRAINT "FestivalImportBatch_prepared_counts_object" CHECK (jsonb_typeof("prepared_counts") = 'object'),
  CONSTRAINT "FestivalImportBatch_profile_safe" CHECK (
    "import_profile" ~ '^[A-Za-z0-9._-]{1,100}$' AND "import_profile_version" > 0
  ),
  CONSTRAINT "FestivalImportBatch_environment_safe" CHECK ("environment" ~ '^[a-z][a-z0-9_-]{0,49}$'),
  CONSTRAINT "FestivalImportBatch_counts_nonnegative" CHECK (
    "total_row_count" >= 0 AND "ready_row_count" >= 0 AND "imported_row_count" >= 0
    AND "duplicate_row_count" >= 0 AND "quarantined_row_count" >= 0 AND "failed_row_count" >= 0
    AND "warning_issue_count" >= 0 AND "error_issue_count" >= 0
  ),
  CONSTRAINT "FestivalImportBatch_row_counts_coherent" CHECK (
    "total_row_count" = "ready_row_count" + "imported_row_count" + "duplicate_row_count"
      + "quarantined_row_count" + "failed_row_count"
  ),
  CONSTRAINT "FestivalImportBatch_review_coherence" CHECK (
    (
      "reviewer_user_id" IS NULL AND "reviewed_at" IS NULL
      AND "reviewed_source_checksum_sha256" IS NULL AND "reviewed_category_map_checksum_sha256" IS NULL
      AND "reviewed_prepared_digest_sha256" IS NULL AND "reviewed_environment" IS NULL
      AND "review_evidence_sha256" IS NULL AND "review_approval_sha256" IS NULL
      AND "review_public_key_sha256" IS NULL AND "review_issued_at" IS NULL AND "review_expires_at" IS NULL
    ) OR (
      "reviewer_user_id" IS NOT NULL AND "reviewed_at" IS NOT NULL AND "reviewer_user_id" <> "operator_user_id"
      AND "reviewed_source_checksum_sha256" = "source_checksum_sha256"
      AND "reviewed_category_map_checksum_sha256" = "category_map_checksum_sha256"
      AND "reviewed_prepared_digest_sha256" = "prepared_digest_sha256"
      AND "reviewed_environment" = "environment"
      AND "review_evidence_sha256" ~ '^[0-9a-f]{64}$'
      AND (
        ("review_approval_sha256" IS NULL AND "review_public_key_sha256" IS NULL AND "review_issued_at" IS NULL AND "review_expires_at" IS NULL)
        OR (
          "review_approval_sha256" ~ '^[0-9a-f]{64}$' AND "review_public_key_sha256" ~ '^[0-9a-f]{64}$'
          AND "review_issued_at" IS NOT NULL AND "review_expires_at" IS NOT NULL
          AND "review_expires_at" > "review_issued_at"
        )
      )
    )
  ),
  CONSTRAINT "FestivalImportBatch_backup_coherence" CHECK (
    (
      "backup_provider" IS NULL AND "backup_artifact_id" IS NULL AND "backup_reference" IS NULL
      AND "backup_checksum_sha256" IS NULL AND "backup_version" IS NULL
      AND "restore_reference" IS NULL AND "restore_verified_at" IS NULL
    ) OR (
      "backup_provider" ~ '^[A-Za-z0-9._-]{1,100}$'
      AND char_length("backup_artifact_id") BETWEEN 1 AND 500
      AND char_length("backup_reference") BETWEEN 1 AND 1000
      AND "backup_checksum_sha256" ~ '^[0-9a-f]{64}$'
      AND char_length("backup_version") BETWEEN 1 AND 200
      AND char_length("restore_reference") BETWEEN 1 AND 1000
      AND "restore_verified_at" IS NOT NULL
    )
  ),
  CONSTRAINT "FestivalImportBatch_backup_override_coherence" CHECK (
    ("backup_override_reason" IS NULL AND "backup_overridden_by_user_id" IS NULL AND "backup_overridden_at" IS NULL)
    OR (
      char_length("backup_override_reason") BETWEEN 1 AND 1000
      AND "backup_overridden_by_user_id" IS NOT NULL
      AND "backup_overridden_at" IS NOT NULL
      AND "backup_overridden_by_user_id" <> "operator_user_id"
      AND "backup_provider" IS NULL
      AND "backup_artifact_id" IS NULL
      AND "backup_reference" IS NULL
      AND "backup_checksum_sha256" IS NULL
      AND "backup_version" IS NULL
      AND "restore_reference" IS NULL
      AND "restore_verified_at" IS NULL
    )
  ),
  CONSTRAINT "FestivalImportBatch_failure_safe" CHECK (
    ("failure_code" IS NULL AND "failure_message" IS NULL)
    OR ("failure_code" ~ '^[a-z0-9_]{1,80}$' AND char_length("failure_message") BETWEEN 1 AND 1000)
  ),
  CONSTRAINT "FestivalImportBatch_status_coherence" CHECK (
    ("status" = 'prepared' AND "started_at" IS NULL AND "completed_at" IS NULL AND "failure_code" IS NULL
      AND "apply_attempt_token" IS NULL AND "apply_attempt_started_at" IS NULL AND "apply_attempt_heartbeat_at" IS NULL AND "apply_attempt_expires_at" IS NULL)
    OR ("status" = 'running' AND "started_at" IS NOT NULL AND "completed_at" IS NULL AND "failure_code" IS NULL
      AND "apply_attempt_token" IS NOT NULL AND "apply_attempt_started_at" IS NOT NULL
      AND "apply_attempt_heartbeat_at" IS NOT NULL AND "apply_attempt_expires_at" IS NOT NULL
      AND "apply_attempt_heartbeat_at" >= "apply_attempt_started_at" AND "apply_attempt_expires_at" > "apply_attempt_heartbeat_at")
    OR ("status" = 'completed' AND "started_at" IS NOT NULL AND "completed_at" IS NOT NULL AND "completed_at" >= "started_at" AND "ready_row_count" = 0 AND "failure_code" IS NULL
      AND "apply_attempt_token" IS NULL AND "apply_attempt_started_at" IS NULL AND "apply_attempt_heartbeat_at" IS NULL AND "apply_attempt_expires_at" IS NULL)
    OR ("status" = 'failed' AND "started_at" IS NOT NULL AND "completed_at" IS NOT NULL AND "completed_at" >= "started_at" AND "failure_code" IS NOT NULL
      AND "apply_attempt_token" IS NULL AND "apply_attempt_started_at" IS NULL AND "apply_attempt_heartbeat_at" IS NULL AND "apply_attempt_expires_at" IS NULL)
    OR ("status" = 'rolled_back' AND "started_at" IS NOT NULL AND "completed_at" IS NOT NULL AND "completed_at" >= "started_at" AND "failure_code" IS NULL
      AND "apply_attempt_token" IS NULL AND "apply_attempt_started_at" IS NULL AND "apply_attempt_heartbeat_at" IS NULL AND "apply_attempt_expires_at" IS NULL)
  ),
  CONSTRAINT "FestivalImportBatch_production_completion_coherence" CHECK (
    "status" <> 'completed' OR "environment" <> 'production' OR (
      "reviewer_user_id" IS NOT NULL
      AND "reviewed_source_checksum_sha256" = "source_checksum_sha256"
      AND "reviewed_category_map_checksum_sha256" = "category_map_checksum_sha256"
      AND "reviewed_prepared_digest_sha256" = "prepared_digest_sha256"
      AND "reviewed_environment" = "environment"
      AND "review_approval_sha256" IS NOT NULL
      AND "review_public_key_sha256" IS NOT NULL
      AND "review_issued_at" IS NOT NULL
      AND "review_expires_at" IS NOT NULL
      AND "backup_provider" IS NOT NULL
      AND "backup_artifact_id" IS NOT NULL
      AND "backup_reference" IS NOT NULL
      AND "backup_checksum_sha256" IS NOT NULL
      AND "backup_version" IS NOT NULL
      AND "restore_reference" IS NOT NULL
      AND "restore_verified_at" IS NOT NULL
      AND "backup_override_reason" IS NULL
    )
  )
);

CREATE TABLE "FestivalImportRow" (
  "id" TEXT NOT NULL,
  "batch_id" TEXT NOT NULL,
  "row_number" INTEGER NOT NULL,
  "source_record_id" TEXT NOT NULL,
  "source_start_line" INTEGER NOT NULL,
  "source_hash_sha256" TEXT NOT NULL,
  "normalized_hash_sha256" TEXT NOT NULL,
  "normalized_data" JSONB NOT NULL,
  "prepared_disposition" "FestivalImportRowDisposition" NOT NULL,
  "prepared_matched_festival_id" TEXT,
  "prepared_digest_sha256" TEXT NOT NULL,
  "disposition" "FestivalImportRowDisposition" NOT NULL DEFAULT 'ready',
  "target_festival_id" TEXT,
  "duplicate_of_row_id" TEXT,
  "matched_festival_id" TEXT,
  "reviewed_by_user_id" TEXT,
  "reviewed_at" TIMESTAMP(3),
  "review_reason" TEXT,
  "match_override_reason" TEXT,
  "match_overridden_by_user_id" TEXT,
  "match_overridden_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FestivalImportRow_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FestivalImportRow_number_positive" CHECK ("row_number" > 0 AND "source_start_line" > 0),
  CONSTRAINT "FestivalImportRow_source_record_id_bounded" CHECK (char_length("source_record_id") BETWEEN 1 AND 300),
  CONSTRAINT "FestivalImportRow_hashes_format" CHECK (
    "source_hash_sha256" ~ '^[0-9a-f]{64}$' AND "normalized_hash_sha256" ~ '^[0-9a-f]{64}$'
    AND "prepared_digest_sha256" ~ '^[0-9a-f]{64}$'
  ),
  CONSTRAINT "FestivalImportRow_normalized_data_redacted" CHECK (
    jsonb_typeof("normalized_data") = 'object'
    AND NOT jsonb_path_exists(
      "normalized_data",
      '$.** ? (@.type() == "object").keyvalue() ? (@.key like_regex "^(contact([_.-]?)(name|email|phone)|submitted([_.-]?)by|raw([_.-]?)(contact|payload))$" flag "i")'
    )
  ),
  CONSTRAINT "FestivalImportRow_not_self_duplicate" CHECK ("duplicate_of_row_id" IS NULL OR "duplicate_of_row_id" <> "id"),
  CONSTRAINT "FestivalImportRow_review_coherence" CHECK (
    ("reviewed_by_user_id" IS NULL AND "reviewed_at" IS NULL AND "review_reason" IS NULL)
    OR ("reviewed_by_user_id" IS NOT NULL AND "reviewed_at" IS NOT NULL AND char_length("review_reason") BETWEEN 1 AND 1000)
  ),
  CONSTRAINT "FestivalImportRow_override_coherence" CHECK (
    ("match_override_reason" IS NULL AND "match_overridden_by_user_id" IS NULL AND "match_overridden_at" IS NULL)
    OR (
      "matched_festival_id" IS NOT NULL
      AND char_length("match_override_reason") BETWEEN 1 AND 1000
      AND "match_overridden_by_user_id" IS NOT NULL
      AND "match_overridden_at" IS NOT NULL
    )
  ),
  CONSTRAINT "FestivalImportRow_disposition_coherence" CHECK (
    ("disposition" = 'ready' AND "target_festival_id" IS NULL AND "duplicate_of_row_id" IS NULL AND "matched_festival_id" IS NULL)
    OR ("disposition" = 'imported' AND "target_festival_id" IS NOT NULL AND "duplicate_of_row_id" IS NULL)
    OR ("disposition" = 'duplicate' AND "target_festival_id" IS NULL AND (("duplicate_of_row_id" IS NOT NULL) <> ("matched_festival_id" IS NOT NULL)))
    OR ("disposition" IN ('quarantined', 'failed') AND "target_festival_id" IS NULL AND "duplicate_of_row_id" IS NULL)
  )
);

CREATE TABLE "FestivalImportIssue" (
  "id" TEXT NOT NULL,
  "batch_id" TEXT NOT NULL,
  "row_id" TEXT,
  "severity" "FestivalImportIssueSeverity" NOT NULL,
  "code" TEXT NOT NULL,
  "field" TEXT,
  "message" TEXT NOT NULL,
  "safe_details" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FestivalImportIssue_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FestivalImportIssue_code_stable" CHECK ("code" ~ '^[a-z][a-z0-9_]{0,79}$'),
  CONSTRAINT "FestivalImportIssue_field_safe" CHECK ("field" IS NULL OR "field" ~ '^[A-Za-z][A-Za-z0-9_.-]{0,119}$'),
  CONSTRAINT "FestivalImportIssue_message_bounded" CHECK (char_length("message") BETWEEN 1 AND 1000),
  CONSTRAINT "FestivalImportIssue_safe_details_redacted" CHECK (
    "safe_details" IS NULL OR (
      jsonb_typeof("safe_details") = 'object'
      AND NOT jsonb_path_exists(
        "safe_details",
        '$.** ? (@.type() == "object").keyvalue() ? (@.key like_regex "^(contact([_.-]?)(name|email|phone)|submitted([_.-]?)by|raw([_.-]?)(contact|payload))$" flag "i")'
      )
    )
  )
);

CREATE OR REPLACE FUNCTION "protect_festival_import_batch_evidence"()
RETURNS TRIGGER AS $$
BEGIN
  IF ROW(
    NEW."source_checksum_sha256", NEW."category_map_checksum_sha256", NEW."prepared_digest_sha256", NEW."prepared_counts",
    NEW."import_profile", NEW."import_profile_version", NEW."environment", NEW."operator_user_id"
  ) IS DISTINCT FROM ROW(
    OLD."source_checksum_sha256", OLD."category_map_checksum_sha256", OLD."prepared_digest_sha256", OLD."prepared_counts",
    OLD."import_profile", OLD."import_profile_version", OLD."environment", OLD."operator_user_id"
  ) THEN
    RAISE EXCEPTION 'Festival import prepared evidence is immutable';
  END IF;
  IF OLD."reviewer_user_id" IS NOT NULL AND ROW(
    NEW."reviewer_user_id", NEW."reviewed_at", NEW."reviewed_source_checksum_sha256",
    NEW."reviewed_category_map_checksum_sha256", NEW."reviewed_prepared_digest_sha256",
    NEW."reviewed_environment", NEW."review_evidence_sha256", NEW."review_approval_sha256",
    NEW."review_public_key_sha256", NEW."review_issued_at", NEW."review_expires_at",
    NEW."backup_provider", NEW."backup_artifact_id", NEW."backup_reference",
    NEW."backup_checksum_sha256", NEW."backup_version", NEW."restore_reference", NEW."restore_verified_at",
    NEW."backup_override_reason", NEW."backup_overridden_by_user_id", NEW."backup_overridden_at"
  ) IS DISTINCT FROM ROW(
    OLD."reviewer_user_id", OLD."reviewed_at", OLD."reviewed_source_checksum_sha256",
    OLD."reviewed_category_map_checksum_sha256", OLD."reviewed_prepared_digest_sha256",
    OLD."reviewed_environment", OLD."review_evidence_sha256", OLD."review_approval_sha256",
    OLD."review_public_key_sha256", OLD."review_issued_at", OLD."review_expires_at",
    OLD."backup_provider", OLD."backup_artifact_id", OLD."backup_reference",
    OLD."backup_checksum_sha256", OLD."backup_version", OLD."restore_reference", OLD."restore_verified_at",
    OLD."backup_override_reason", OLD."backup_overridden_by_user_id", OLD."backup_overridden_at"
  ) THEN
    RAISE EXCEPTION 'Festival import review evidence is immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "FestivalImportBatch_evidence_immutable_trigger"
BEFORE UPDATE ON "FestivalImportBatch"
FOR EACH ROW EXECUTE FUNCTION "protect_festival_import_batch_evidence"();

CREATE OR REPLACE FUNCTION "protect_festival_import_row_prepared_evidence"()
RETURNS TRIGGER AS $$
BEGIN
  IF ROW(
    NEW."batch_id", NEW."row_number", NEW."source_record_id", NEW."source_start_line",
    NEW."source_hash_sha256", NEW."normalized_hash_sha256", NEW."normalized_data",
    NEW."prepared_disposition", NEW."prepared_matched_festival_id", NEW."prepared_digest_sha256",
    NEW."duplicate_of_row_id"
  ) IS DISTINCT FROM ROW(
    OLD."batch_id", OLD."row_number", OLD."source_record_id", OLD."source_start_line",
    OLD."source_hash_sha256", OLD."normalized_hash_sha256", OLD."normalized_data",
    OLD."prepared_disposition", OLD."prepared_matched_festival_id", OLD."prepared_digest_sha256",
    OLD."duplicate_of_row_id"
  ) THEN
    RAISE EXCEPTION 'Festival import row prepared evidence is immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "FestivalImportRow_prepared_evidence_immutable_trigger"
BEFORE UPDATE ON "FestivalImportRow"
FOR EACH ROW EXECUTE FUNCTION "protect_festival_import_row_prepared_evidence"();

CREATE OR REPLACE FUNCTION "reject_festival_import_issue_mutation"()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Festival import issues are append-only';
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "FestivalImportIssue_append_only_update_trigger"
BEFORE UPDATE ON "FestivalImportIssue" FOR EACH ROW EXECUTE FUNCTION "reject_festival_import_issue_mutation"();
CREATE TRIGGER "FestivalImportIssue_append_only_delete_trigger"
BEFORE DELETE ON "FestivalImportIssue" FOR EACH ROW EXECUTE FUNCTION "reject_festival_import_issue_mutation"();


CREATE UNIQUE INDEX "FestivalImportBatch_source_checksum_sha256_key" ON "FestivalImportBatch"("source_checksum_sha256");
CREATE UNIQUE INDEX "FestivalImportBatch_apply_attempt_token_key" ON "FestivalImportBatch"("apply_attempt_token");
CREATE INDEX "FestivalImportBatch_status_created_at_idx" ON "FestivalImportBatch"("status", "created_at");
CREATE INDEX "FestivalImportBatch_operator_user_id_created_at_idx" ON "FestivalImportBatch"("operator_user_id", "created_at");
CREATE INDEX "FestivalImportBatch_reviewer_user_id_reviewed_at_idx" ON "FestivalImportBatch"("reviewer_user_id", "reviewed_at");
CREATE UNIQUE INDEX "FestivalImportRow_batch_id_row_number_key" ON "FestivalImportRow"("batch_id", "row_number");
CREATE UNIQUE INDEX "FestivalImportRow_id_batch_id_key" ON "FestivalImportRow"("id", "batch_id");
CREATE UNIQUE INDEX "FestivalImportRow_imported_target_festival_id_key" ON "FestivalImportRow"("target_festival_id") WHERE "disposition" = 'imported';
CREATE INDEX "FestivalImportRow_batch_id_disposition_row_number_idx" ON "FestivalImportRow"("batch_id", "disposition", "row_number");
CREATE INDEX "FestivalImportRow_duplicate_of_row_id_idx" ON "FestivalImportRow"("duplicate_of_row_id");
CREATE INDEX "FestivalImportRow_matched_festival_id_idx" ON "FestivalImportRow"("matched_festival_id");
CREATE INDEX "FestivalImportRow_prepared_matched_festival_id_idx" ON "FestivalImportRow"("prepared_matched_festival_id");
CREATE INDEX "FestivalImportRow_reviewed_by_user_id_reviewed_at_idx" ON "FestivalImportRow"("reviewed_by_user_id", "reviewed_at");
CREATE INDEX "FestivalImportIssue_batch_id_severity_code_idx" ON "FestivalImportIssue"("batch_id", "severity", "code");
CREATE INDEX "FestivalImportIssue_row_id_severity_idx" ON "FestivalImportIssue"("row_id", "severity");

ALTER TABLE "FestivalImportBatch" ADD CONSTRAINT "FestivalImportBatch_operator_user_id_fkey"
FOREIGN KEY ("operator_user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FestivalImportBatch" ADD CONSTRAINT "FestivalImportBatch_reviewer_user_id_fkey"
FOREIGN KEY ("reviewer_user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FestivalImportBatch" ADD CONSTRAINT "FestivalImportBatch_backup_overridden_by_user_id_fkey"
FOREIGN KEY ("backup_overridden_by_user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FestivalImportRow" ADD CONSTRAINT "FestivalImportRow_batch_id_fkey"
FOREIGN KEY ("batch_id") REFERENCES "FestivalImportBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FestivalImportRow" ADD CONSTRAINT "FestivalImportRow_target_festival_id_fkey"
FOREIGN KEY ("target_festival_id") REFERENCES "Festival"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FestivalImportRow" ADD CONSTRAINT "FestivalImportRow_duplicate_of_row_id_fkey"
FOREIGN KEY ("duplicate_of_row_id") REFERENCES "FestivalImportRow"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FestivalImportRow" ADD CONSTRAINT "FestivalImportRow_matched_festival_id_fkey"
FOREIGN KEY ("matched_festival_id") REFERENCES "Festival"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FestivalImportRow" ADD CONSTRAINT "FestivalImportRow_prepared_matched_festival_id_fkey"
FOREIGN KEY ("prepared_matched_festival_id") REFERENCES "Festival"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FestivalImportRow" ADD CONSTRAINT "FestivalImportRow_reviewed_by_user_id_fkey"
FOREIGN KEY ("reviewed_by_user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FestivalImportRow" ADD CONSTRAINT "FestivalImportRow_match_overridden_by_user_id_fkey"
FOREIGN KEY ("match_overridden_by_user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FestivalImportIssue" ADD CONSTRAINT "FestivalImportIssue_batch_id_fkey"
FOREIGN KEY ("batch_id") REFERENCES "FestivalImportBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FestivalImportIssue" ADD CONSTRAINT "FestivalImportIssue_row_id_batch_id_fkey"
FOREIGN KEY ("row_id", "batch_id") REFERENCES "FestivalImportRow"("id", "batch_id") ON DELETE RESTRICT ON UPDATE CASCADE;
