-- F-07 producer-owned submissions, private assets, workflow history, and notification outbox.
-- Public reads continue to use the legacy Festival.status column. F-07 submit and the
-- minimal legacy moderation path keep status aligned with the new workflow state.

CREATE TYPE "FestivalWorkflowState" AS ENUM (
    'draft',
    'pending_review',
    'changes_requested',
    'approved',
    'rejected',
    'published',
    'unpublished',
    'canceled',
    'archived'
);

CREATE TYPE "FestivalAssetPurpose" AS ENUM ('logo', 'hero_image', 'gallery_image');
CREATE TYPE "FestivalAssetScanStatus" AS ENUM ('pending', 'clean', 'infected', 'failed');
CREATE TYPE "FestivalAssetLifecycleStatus" AS ENUM ('active', 'quarantined', 'deleted');
CREATE TYPE "ProducerSubmissionNotificationType" AS ENUM ('producer_receipt', 'team_notification');
CREATE TYPE "ProducerSubmissionNotificationStatus" AS ENUM ('pending', 'sent', 'failed');
CREATE TYPE "FestivalAssetReconciliationStatus" AS ENUM ('pending', 'retrying', 'cleaned', 'failed');

ALTER TABLE "Festival"
ADD COLUMN "owner_user_id" TEXT,
ADD COLUMN "workflow_state" "FestivalWorkflowState" NOT NULL DEFAULT 'draft',
ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "submission_key" TEXT,
ADD COLUMN "representation_acknowledged_at" TIMESTAMP(3),
ADD COLUMN "accuracy_acknowledged_at" TIMESTAMP(3),
ADD COLUMN "terms_acknowledged_at" TIMESTAMP(3),
ADD COLUMN "terms_version" INTEGER;

-- Conservatively mirror known legacy moderation values. Unknown/private legacy values
-- become workflow drafts; this never changes the public status or publishes a draft.
UPDATE "Festival"
SET "workflow_state" = CASE LOWER("status")
    WHEN 'pending' THEN 'pending_review'::"FestivalWorkflowState"
    WHEN 'submitted' THEN 'pending_review'::"FestivalWorkflowState"
    WHEN 'pending_review' THEN 'pending_review'::"FestivalWorkflowState"
    WHEN 'changes_requested' THEN 'changes_requested'::"FestivalWorkflowState"
    WHEN 'approved' THEN 'approved'::"FestivalWorkflowState"
    WHEN 'rejected' THEN 'rejected'::"FestivalWorkflowState"
    WHEN 'published' THEN 'published'::"FestivalWorkflowState"
    WHEN 'unpublished' THEN 'unpublished'::"FestivalWorkflowState"
    WHEN 'canceled' THEN 'canceled'::"FestivalWorkflowState"
    WHEN 'withdrawn' THEN 'archived'::"FestivalWorkflowState"
    WHEN 'archived' THEN 'archived'::"FestivalWorkflowState"
    ELSE 'draft'::"FestivalWorkflowState"
END;

-- Canonicalize only moderation states that F-07 must keep coherent. This does not
-- approve or publish any additional festival.
UPDATE "Festival"
SET "status" = CASE "workflow_state"
  WHEN 'pending_review' THEN 'pending'
  WHEN 'approved' THEN 'approved'
  WHEN 'rejected' THEN 'rejected'
  ELSE "status"
END
WHERE "workflow_state" IN ('pending_review', 'approved', 'rejected');

ALTER TABLE "Festival"
ADD CONSTRAINT "Festival_revision_nonnegative" CHECK ("revision" >= 0),
ADD CONSTRAINT "Festival_terms_version_positive" CHECK ("terms_version" IS NULL OR "terms_version" > 0),
ADD CONSTRAINT "Festival_review_status_coherence" CHECK (
  ("workflow_state" <> 'pending_review' OR LOWER("status") = 'pending')
  AND ("workflow_state" <> 'approved' OR LOWER("status") = 'approved')
  AND ("workflow_state" <> 'rejected' OR LOWER("status") = 'rejected')
);

CREATE UNIQUE INDEX "Festival_owner_user_id_submission_key_key"
ON "Festival"("owner_user_id", "submission_key");
CREATE INDEX "Festival_owner_user_id_workflow_state_updated_at_idx"
ON "Festival"("owner_user_id", "workflow_state", "updated_at");

CREATE TABLE "FestivalTransition" (
    "id" TEXT NOT NULL,
    "festival_id" TEXT NOT NULL,
    "actor_user_id" TEXT NOT NULL,
    "from_state" "FestivalWorkflowState",
    "to_state" "FestivalWorkflowState" NOT NULL,
    "revision" INTEGER NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FestivalTransition_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "FestivalTransition_revision_nonnegative" CHECK ("revision" >= 0)
);

CREATE UNIQUE INDEX "FestivalTransition_festival_id_revision_key"
ON "FestivalTransition"("festival_id", "revision");
CREATE INDEX "FestivalTransition_actor_user_id_created_at_idx"
ON "FestivalTransition"("actor_user_id", "created_at");

CREATE TABLE "FestivalAsset" (
    "id" TEXT NOT NULL,
    "festival_id" TEXT NOT NULL,
    "uploader_user_id" TEXT NOT NULL,
    "drive_file_id" TEXT NOT NULL,
    "server_filename" TEXT NOT NULL,
    "original_filename" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "byte_size" INTEGER NOT NULL,
    "checksum_sha256" TEXT NOT NULL,
    "purpose" "FestivalAssetPurpose" NOT NULL,
    "alt_text" TEXT NOT NULL,
    "rights_version" INTEGER NOT NULL,
    "rights_acknowledged_at" TIMESTAMP(3) NOT NULL,
    "provider_md5_checksum" TEXT,
    "provider_version" TEXT,
    "scan_status" "FestivalAssetScanStatus" NOT NULL DEFAULT 'pending',
    "lifecycle_status" "FestivalAssetLifecycleStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FestivalAsset_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "FestivalAsset_byte_size_positive" CHECK ("byte_size" > 0),
    CONSTRAINT "FestivalAsset_checksum_sha256_format" CHECK ("checksum_sha256" ~ '^[0-9a-f]{64}$'),
    CONSTRAINT "FestivalAsset_rights_version_positive" CHECK ("rights_version" > 0)
);

CREATE UNIQUE INDEX "FestivalAsset_drive_file_id_key" ON "FestivalAsset"("drive_file_id");
CREATE INDEX "FestivalAsset_festival_id_lifecycle_status_created_at_idx"
ON "FestivalAsset"("festival_id", "lifecycle_status", "created_at");
CREATE INDEX "FestivalAsset_uploader_user_id_created_at_idx"
ON "FestivalAsset"("uploader_user_id", "created_at");
CREATE INDEX "FestivalAsset_scan_status_created_at_idx"
ON "FestivalAsset"("scan_status", "created_at");

CREATE TABLE "FestivalAssetReconciliation" (
    "id" TEXT NOT NULL,
    "reconciliation_marker" TEXT NOT NULL,
    "provider_file_id" TEXT NOT NULL,
    "server_filename" TEXT NOT NULL,
    "checksum_sha256" TEXT NOT NULL,
    "cleanup_status" "FestivalAssetReconciliationStatus" NOT NULL DEFAULT 'pending',
    "cleanup_attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error_code" TEXT,
    "last_attempted_at" TIMESTAMP(3),
    "cleaned_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FestivalAssetReconciliation_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "FestivalAssetReconciliation_attempts_nonnegative" CHECK ("cleanup_attempts" >= 0),
    CONSTRAINT "FestivalAssetReconciliation_checksum_sha256_format" CHECK ("checksum_sha256" ~ '^[0-9a-f]{64}$')
);

CREATE UNIQUE INDEX "FestivalAssetReconciliation_reconciliation_marker_key"
ON "FestivalAssetReconciliation"("reconciliation_marker");
CREATE UNIQUE INDEX "FestivalAssetReconciliation_provider_file_id_key"
ON "FestivalAssetReconciliation"("provider_file_id");
CREATE INDEX "FestivalAssetReconciliation_cleanup_status_created_at_idx"
ON "FestivalAssetReconciliation"("cleanup_status", "created_at");

CREATE TABLE "ProducerSubmissionNotification" (
    "id" TEXT NOT NULL,
    "festival_id" TEXT NOT NULL,
    "workflow_revision" INTEGER NOT NULL,
    "notification_type" "ProducerSubmissionNotificationType" NOT NULL,
    "delivery_status" "ProducerSubmissionNotificationStatus" NOT NULL DEFAULT 'pending',
    "recipient_email" TEXT,
    "recipient_alias" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "provider_message_id" TEXT,
    "failure_code" TEXT,
    "attempt_token" TEXT,
    "attempt_started_at" TIMESTAMP(3),
    "attempted_at" TIMESTAMP(3),
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProducerSubmissionNotification_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ProducerSubmissionNotification_revision_nonnegative" CHECK ("workflow_revision" >= 0),
    CONSTRAINT "ProducerSubmissionNotification_attempts_nonnegative" CHECK ("attempts" >= 0),
    CONSTRAINT "ProducerSubmissionNotification_recipient_kind" CHECK (
      ("notification_type" = 'producer_receipt' AND "recipient_email" IS NOT NULL AND "recipient_alias" IS NULL)
      OR
      ("notification_type" = 'team_notification' AND "recipient_email" IS NULL AND "recipient_alias" IS NOT NULL)
    )
);

CREATE UNIQUE INDEX "ProducerSubmissionNotification_festival_id_workflow_revision_notification_type_key"
ON "ProducerSubmissionNotification"("festival_id", "workflow_revision", "notification_type");
CREATE UNIQUE INDEX "ProducerSubmissionNotification_attempt_token_key"
ON "ProducerSubmissionNotification"("attempt_token");
CREATE INDEX "ProducerSubmissionNotification_delivery_status_created_at_idx"
ON "ProducerSubmissionNotification"("delivery_status", "created_at");

ALTER TABLE "Festival" ADD CONSTRAINT "Festival_owner_user_id_fkey"
FOREIGN KEY ("owner_user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FestivalTransition" ADD CONSTRAINT "FestivalTransition_festival_id_fkey"
FOREIGN KEY ("festival_id") REFERENCES "Festival"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FestivalTransition" ADD CONSTRAINT "FestivalTransition_actor_user_id_fkey"
FOREIGN KEY ("actor_user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FestivalAsset" ADD CONSTRAINT "FestivalAsset_festival_id_fkey"
FOREIGN KEY ("festival_id") REFERENCES "Festival"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FestivalAsset" ADD CONSTRAINT "FestivalAsset_uploader_user_id_fkey"
FOREIGN KEY ("uploader_user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProducerSubmissionNotification" ADD CONSTRAINT "ProducerSubmissionNotification_festival_id_fkey"
FOREIGN KEY ("festival_id") REFERENCES "Festival"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Workflow history is append-only even for direct SQL/administrative callers.
CREATE FUNCTION "reject_festival_transition_mutation"()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'FestivalTransition history is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "FestivalTransition_append_only_update_trigger"
BEFORE UPDATE ON "FestivalTransition"
FOR EACH ROW EXECUTE FUNCTION "reject_festival_transition_mutation"();

CREATE TRIGGER "FestivalTransition_append_only_delete_trigger"
BEFORE DELETE ON "FestivalTransition"
FOR EACH ROW EXECUTE FUNCTION "reject_festival_transition_mutation"();
