-- F-08 editorial workflow expand migration.
-- workflow_state is authoritative. status is retained only as a trigger-maintained
-- compatibility projection until a later contract migration removes legacy readers.

CREATE TYPE "FestivalWorkflowNotificationStatus" AS ENUM ('pending', 'sent', 'failed');
CREATE TYPE "FestivalWorkflowNotificationAudience" AS ENUM ('producer');
CREATE TYPE "FestivalAssetEditorialStatus" AS ENUM ('pending', 'approved', 'rejected');

ALTER TABLE "Festival"
  ADD COLUMN "first_published_at" TIMESTAMP(3),
  ADD COLUMN "published_at" TIMESTAMP(3),
  ADD COLUMN "canceled_at" TIMESTAMP(3),
  ADD COLUMN "public_message" TEXT;

ALTER TABLE "FestivalAsset"
  ADD COLUMN "editorial_status" "FestivalAssetEditorialStatus" NOT NULL DEFAULT 'pending',
  ADD COLUMN "reviewed_by_user_id" TEXT,
  ADD COLUMN "reviewed_at" TIMESTAMP(3),
  ADD COLUMN "editorial_reason" TEXT;

ALTER TABLE "FestivalTransition"
  ADD COLUMN "producer_message" TEXT,
  ADD COLUMN "public_message" TEXT;

ALTER TABLE "Schedule" ADD COLUMN "occurrence_id" TEXT;

ALTER TABLE "Festival" DROP CONSTRAINT IF EXISTS "Festival_review_status_coherence";

CREATE OR REPLACE FUNCTION "festival_legacy_status_for_workflow"(state "FestivalWorkflowState")
RETURNS TEXT AS $$
  SELECT CASE state
    WHEN 'pending_review' THEN 'pending'
    ELSE state::text
  END;
$$ LANGUAGE sql IMMUTABLE STRICT;

CREATE OR REPLACE FUNCTION "sync_festival_legacy_status"()
RETURNS TRIGGER AS $$
BEGIN
  NEW."status" := "festival_legacy_status_for_workflow"(NEW."workflow_state");
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "Festival_workflow_status_compatibility_trigger"
BEFORE INSERT OR UPDATE OF "workflow_state", "status" ON "Festival"
FOR EACH ROW EXECUTE FUNCTION "sync_festival_legacy_status"();

-- Replace F-06 expand-phase calendar trigger logic so approved-but-unpublished rows
-- cannot stamp public calendar metadata. Existing published timestamps remain immutable.
CREATE OR REPLACE FUNCTION "set_festival_calendar_metadata"()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW."calendar_sequence" := 0;
    IF NEW."workflow_state" = 'published' THEN
      NEW."calendar_published_at" := COALESCE(NEW."calendar_published_at", NEW."updated_at", CURRENT_TIMESTAMP);
    ELSE
      NEW."calendar_published_at" := NULL;
    END IF;
  ELSE
    IF OLD."calendar_published_at" IS NOT NULL THEN
      NEW."calendar_published_at" := OLD."calendar_published_at";
    ELSIF NEW."workflow_state" = 'published' THEN
      NEW."calendar_published_at" := COALESCE(NEW."calendar_published_at", NEW."updated_at", CURRENT_TIMESTAMP);
    ELSE
      NEW."calendar_published_at" := NULL;
    END IF;
    IF ROW(NEW."workflow_state", NEW."name", NEW."slug", NEW."description", NEW."location", NEW."start_date", NEW."end_date", NEW."calendar_date_type", NEW."time_zone", NEW."all_day_start", NEW."all_day_end", NEW."calendar_status")
      IS DISTINCT FROM ROW(OLD."workflow_state", OLD."name", OLD."slug", OLD."description", OLD."location", OLD."start_date", OLD."end_date", OLD."calendar_date_type", OLD."time_zone", OLD."all_day_start", OLD."all_day_end", OLD."calendar_status") THEN
      NEW."calendar_sequence" := OLD."calendar_sequence" + 1;
    ELSE
      NEW."calendar_sequence" := OLD."calendar_sequence";
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION "stamp_published_festival_schedules"()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."workflow_state" = 'published' AND OLD."workflow_state" IS DISTINCT FROM 'published' THEN
    UPDATE "Schedule" SET "calendar_published_at" = COALESCE("calendar_published_at", NEW."updated_at", CURRENT_TIMESTAMP)
    WHERE "festival_id" = NEW."id" AND "calendar_published_at" IS NULL;
  END IF;
  IF NEW."calendar_sequence" > OLD."calendar_sequence" THEN
    UPDATE "Schedule" SET "calendar_sequence" = "calendar_sequence" + 1, "updated_at" = GREATEST("updated_at", NEW."updated_at")
    WHERE "festival_id" = NEW."id";
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION "set_schedule_calendar_metadata"()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW."calendar_sequence" := 0;
    IF EXISTS (SELECT 1 FROM "Festival" WHERE "id" = NEW."festival_id" AND "workflow_state" = 'published') THEN
      NEW."calendar_published_at" := COALESCE(NEW."updated_at", CURRENT_TIMESTAMP);
    ELSE
      NEW."calendar_published_at" := NULL;
    END IF;
  ELSE
    IF OLD."calendar_published_at" IS NOT NULL THEN
      NEW."calendar_published_at" := OLD."calendar_published_at";
    ELSIF EXISTS (SELECT 1 FROM "Festival" WHERE "id" = NEW."festival_id" AND "workflow_state" = 'published') THEN
      NEW."calendar_published_at" := COALESCE(NEW."updated_at", CURRENT_TIMESTAMP);
    ELSE
      NEW."calendar_published_at" := NULL;
    END IF;
    IF pg_trigger_depth() > 1 AND NEW."calendar_sequence" = OLD."calendar_sequence" + 1 THEN
      NEW."calendar_sequence" := OLD."calendar_sequence" + 1;
    ELSIF ROW(NEW."festival_id", NEW."title", NEW."description", NEW."location", NEW."start_time", NEW."end_time", NEW."calendar_date_type", NEW."time_zone", NEW."all_day_start", NEW."all_day_end", NEW."calendar_status")
      IS DISTINCT FROM ROW(OLD."festival_id", OLD."title", OLD."description", OLD."location", OLD."start_time", OLD."end_time", OLD."calendar_date_type", OLD."time_zone", OLD."all_day_start", OLD."all_day_end", OLD."calendar_status") THEN
      NEW."calendar_sequence" := OLD."calendar_sequence" + 1;
    ELSE
      NEW."calendar_sequence" := OLD."calendar_sequence";
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Legacy public rows with no interval that can become a valid primary occurrence must
-- not remain live when the deferred live-row invariant is enabled. Preserve explicit
-- migration evidence in the existing private moderation field without fabricating dates.
UPDATE "Festival"
SET "workflow_state" = CASE
      WHEN "workflow_state" = 'published' THEN 'approved'::"FestivalWorkflowState"
      ELSE 'unpublished'::"FestivalWorkflowState"
    END,
    "rejection_reason" = concat_ws(E'\n', NULLIF("rejection_reason", ''),
      CASE
        WHEN "workflow_state" = 'published' THEN '[F-08 migration] Legacy published row made approved/private: no valid occurrence interval was available.'
        ELSE '[F-08 migration] Legacy canceled row made unpublished/private: no valid occurrence interval or reliable prior-publication evidence was available.'
      END),
    "calendar_published_at" = NULL
WHERE "workflow_state" IN ('published', 'canceled')
  AND NOT (
    ("calendar_date_type" = 'timed' AND "start_date" IS NOT NULL AND "end_date" IS NOT NULL AND "end_date" > "start_date")
    OR
    ("calendar_date_type" = 'all_day' AND "all_day_start" IS NOT NULL AND "all_day_end" IS NOT NULL AND "all_day_end" >= "all_day_start")
  );

-- Canonicalize every existing compatibility value without changing authoritative state.
UPDATE "Festival" SET "status" = "festival_legacy_status_for_workflow"("workflow_state");
-- Preserve evidence for legacy rows that were already public before F-08.
UPDATE "Festival"
SET "first_published_at" = COALESCE("calendar_published_at", "updated_at", "created_at"),
    "published_at" = COALESCE("calendar_published_at", "updated_at", "created_at"),
    "calendar_published_at" = COALESCE("calendar_published_at", "updated_at", "created_at")
WHERE "workflow_state" = 'published';
-- A legacy cancellation remains a public tombstone only when both a valid interval and
-- concrete prior calendar-publication evidence survived. Keep its publication timestamp,
-- supply a safe public fallback, and leave evidence-free cancellations private.
UPDATE "Festival"
SET "first_published_at" = "calendar_published_at",
    "canceled_at" = COALESCE("updated_at", "created_at"),
    "public_message" = COALESCE(NULLIF(btrim("public_message"), ''), 'This festival has been canceled.')
WHERE "workflow_state" = 'canceled'
  AND "calendar_published_at" IS NOT NULL;
UPDATE "Festival"
SET "canceled_at" = COALESCE("updated_at", "created_at")
WHERE "workflow_state" = 'canceled';

ALTER TABLE "Festival"
  ADD CONSTRAINT "Festival_status_workflow_compatibility" CHECK (
    "status" = "festival_legacy_status_for_workflow"("workflow_state")
  ),
  ADD CONSTRAINT "Festival_public_message_cancellation_only" CHECK (
    "public_message" IS NULL OR ("workflow_state" = 'canceled' AND "first_published_at" IS NOT NULL)
  ),
  ADD CONSTRAINT "Festival_publication_metadata" CHECK (
    ("workflow_state" = 'published' AND "published_at" IS NOT NULL AND "first_published_at" IS NOT NULL AND "calendar_published_at" IS NOT NULL)
    OR ("workflow_state" <> 'published' AND "published_at" IS NULL)
  ),
  ADD CONSTRAINT "Festival_cancellation_metadata" CHECK (
    ("workflow_state" = 'canceled' AND "canceled_at" IS NOT NULL)
    OR ("workflow_state" <> 'canceled' AND "canceled_at" IS NULL)
  );

CREATE INDEX "Festival_workflow_state_start_date_id_idx"
ON "Festival"("workflow_state", "start_date", "id");

CREATE OR REPLACE FUNCTION "enforce_festival_workflow_transition"()
RETURNS TRIGGER AS $$
DECLARE allowed BOOLEAN;
BEGIN
  IF NEW."workflow_state" = OLD."workflow_state" THEN
    RETURN NEW;
  END IF;
  allowed := CASE OLD."workflow_state"
    WHEN 'draft' THEN NEW."workflow_state" IN ('pending_review', 'archived')
    WHEN 'changes_requested' THEN NEW."workflow_state" IN ('pending_review', 'archived')
    WHEN 'pending_review' THEN NEW."workflow_state" IN ('changes_requested', 'rejected', 'approved')
    WHEN 'rejected' THEN NEW."workflow_state" IN ('changes_requested', 'archived')
    WHEN 'approved' THEN NEW."workflow_state" IN ('published', 'changes_requested', 'archived')
    WHEN 'published' THEN NEW."workflow_state" IN ('unpublished', 'canceled', 'archived')
    WHEN 'unpublished' THEN NEW."workflow_state" IN ('published', 'changes_requested', 'canceled', 'archived')
    WHEN 'canceled' THEN NEW."workflow_state" = 'archived'
    WHEN 'archived' THEN FALSE
    ELSE FALSE
  END;
  IF NOT allowed THEN
    RAISE EXCEPTION 'Invalid festival workflow transition: % -> %', OLD."workflow_state", NEW."workflow_state" USING ERRCODE = 'check_violation';
  END IF;
  IF NEW."revision" <> OLD."revision" + 1 THEN
    RAISE EXCEPTION 'Workflow transition must increment revision exactly once' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "Festival_workflow_graph_trigger"
BEFORE UPDATE OF "workflow_state" ON "Festival"
FOR EACH ROW EXECUTE FUNCTION "enforce_festival_workflow_transition"();

CREATE TABLE "FestivalOccurrence" (
  "id" TEXT NOT NULL,
  "festival_id" TEXT NOT NULL,
  "source_key" TEXT,
  "is_primary" BOOLEAN NOT NULL DEFAULT FALSE,
  "calendar_date_type" "CalendarDateType" NOT NULL DEFAULT 'timed',
  "time_zone" TEXT NOT NULL DEFAULT 'America/New_York',
  "start_at" TIMESTAMP(3),
  "end_at" TIMESTAMP(3),
  "all_day_start" DATE,
  "all_day_end" DATE,
  "calendar_status" "CalendarStatus" NOT NULL DEFAULT 'confirmed',
  "calendar_sequence" INTEGER NOT NULL DEFAULT 0,
  "calendar_published_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FestivalOccurrence_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FestivalOccurrence_valid_interval" CHECK (
    ("calendar_date_type" = 'timed' AND "start_at" IS NOT NULL AND "end_at" IS NOT NULL AND "end_at" > "start_at" AND "all_day_start" IS NULL AND "all_day_end" IS NULL)
    OR
    ("calendar_date_type" = 'all_day' AND "all_day_start" IS NOT NULL AND "all_day_end" IS NOT NULL AND "all_day_end" >= "all_day_start" AND "start_at" IS NULL AND "end_at" IS NULL)
  ),
  CONSTRAINT "FestivalOccurrence_calendar_sequence_nonnegative" CHECK ("calendar_sequence" >= 0)
);

CREATE UNIQUE INDEX "FestivalOccurrence_festival_id_source_key_key"
ON "FestivalOccurrence"("festival_id", "source_key");
CREATE UNIQUE INDEX "FestivalOccurrence_one_primary_per_festival"
ON "FestivalOccurrence"("festival_id") WHERE "is_primary";
CREATE INDEX "FestivalOccurrence_festival_id_is_primary_idx"
ON "FestivalOccurrence"("festival_id", "is_primary");
CREATE INDEX "FestivalOccurrence_calendar_status_calendar_published_at_idx"
ON "FestivalOccurrence"("calendar_status", "calendar_published_at");

ALTER TABLE "FestivalOccurrence" ADD CONSTRAINT "FestivalOccurrence_festival_id_fkey"
FOREIGN KEY ("festival_id") REFERENCES "Festival"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill exactly one deterministic primary occurrence only for valid existing intervals.
INSERT INTO "FestivalOccurrence" (
  "id", "festival_id", "source_key", "is_primary", "calendar_date_type", "time_zone",
  "start_at", "end_at", "all_day_start", "all_day_end", "calendar_status",
  "calendar_sequence", "calendar_published_at", "created_at", "updated_at"
)
SELECT
  substr(md5('f08-primary:' || "id"), 1, 8) || '-' || substr(md5('f08-primary:' || "id"), 9, 4) || '-4' || substr(md5('f08-primary:' || "id"), 14, 3) || '-8' || substr(md5('f08-primary:' || "id"), 18, 3) || '-' || substr(md5('f08-primary:' || "id"), 21, 12),
  "id", 'legacy-primary', TRUE, "calendar_date_type", "time_zone",
  "start_date", "end_date", "all_day_start", "all_day_end", "calendar_status",
  "calendar_sequence", "calendar_published_at", "created_at", "updated_at"
FROM "Festival"
WHERE
  ("calendar_date_type" = 'timed' AND "start_date" IS NOT NULL AND "end_date" IS NOT NULL AND "end_date" > "start_date")
  OR
  ("calendar_date_type" = 'all_day' AND "all_day_start" IS NOT NULL AND "all_day_end" IS NOT NULL AND "all_day_end" >= "all_day_start")
ON CONFLICT ("festival_id", "source_key") DO NOTHING;

-- Attach only program items whose interval is contained by the matching primary
-- occurrence. Items with incomplete/out-of-range dates remain explicitly nullable.
UPDATE "Schedule" schedule
SET "occurrence_id" = occurrence."id"
FROM "FestivalOccurrence" occurrence
WHERE schedule."occurrence_id" IS NULL
  AND occurrence."festival_id" = schedule."festival_id"
  AND occurrence."is_primary"
  AND (
    (occurrence."calendar_date_type" = 'timed'
      AND schedule."start_time" IS NOT NULL
      AND schedule."start_time" >= occurrence."start_at"
      AND COALESCE(schedule."end_time", schedule."start_time") <= occurrence."end_at")
    OR
    (occurrence."calendar_date_type" = 'all_day'
      AND schedule."all_day_start" IS NOT NULL
      AND schedule."all_day_start" >= occurrence."all_day_start"
      AND COALESCE(schedule."all_day_end", schedule."all_day_start") <= occurrence."all_day_end")
  );

CREATE UNIQUE INDEX "FestivalOccurrence_id_festival_id_key"
ON "FestivalOccurrence"("id", "festival_id");
CREATE INDEX "Schedule_occurrence_id_festival_id_idx" ON "Schedule"("occurrence_id", "festival_id");
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_occurrence_id_festival_id_fkey"
FOREIGN KEY ("occurrence_id", "festival_id") REFERENCES "FestivalOccurrence"("id", "festival_id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "FestivalRevision" (
  "id" TEXT NOT NULL,
  "festival_id" TEXT NOT NULL,
  "workflow_revision" INTEGER NOT NULL,
  "transition_id" TEXT NOT NULL,
  "actor_user_id" TEXT NOT NULL,
  "snapshot" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FestivalRevision_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FestivalRevision_revision_nonnegative" CHECK ("workflow_revision" >= 0),
  CONSTRAINT "FestivalRevision_snapshot_object" CHECK (jsonb_typeof("snapshot") = 'object')
);
CREATE UNIQUE INDEX "FestivalTransition_id_festival_id_revision_actor_user_id_key"
ON "FestivalTransition"("id", "festival_id", "revision", "actor_user_id");
CREATE UNIQUE INDEX "FestivalRevision_transition_id_key" ON "FestivalRevision"("transition_id");
CREATE UNIQUE INDEX "FestivalRevision_festival_id_workflow_revision_key" ON "FestivalRevision"("festival_id", "workflow_revision");
CREATE UNIQUE INDEX "FestivalRevision_transition_id_festival_id_workflow_revision_actor_user_id_key"
ON "FestivalRevision"("transition_id", "festival_id", "workflow_revision", "actor_user_id");
CREATE INDEX "FestivalRevision_actor_user_id_created_at_idx" ON "FestivalRevision"("actor_user_id", "created_at");
ALTER TABLE "FestivalRevision" ADD CONSTRAINT "FestivalRevision_festival_id_fkey" FOREIGN KEY ("festival_id") REFERENCES "Festival"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FestivalRevision" ADD CONSTRAINT "FestivalRevision_transition_identity_fkey"
FOREIGN KEY ("transition_id", "festival_id", "workflow_revision", "actor_user_id")
REFERENCES "FestivalTransition"("id", "festival_id", "revision", "actor_user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FestivalRevision" ADD CONSTRAINT "FestivalRevision_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TRIGGER "FestivalRevision_append_only_update_trigger"
BEFORE UPDATE ON "FestivalRevision" FOR EACH ROW EXECUTE FUNCTION "reject_festival_transition_mutation"();
CREATE TRIGGER "FestivalRevision_append_only_delete_trigger"
BEFORE DELETE ON "FestivalRevision" FOR EACH ROW EXECUTE FUNCTION "reject_festival_transition_mutation"();

CREATE TABLE "FestivalWorkflowNotification" (
  "id" TEXT NOT NULL,
  "festival_id" TEXT NOT NULL,
  "workflow_revision" INTEGER NOT NULL,
  "audience" "FestivalWorkflowNotificationAudience" NOT NULL DEFAULT 'producer',
  "delivery_status" "FestivalWorkflowNotificationStatus" NOT NULL DEFAULT 'pending',
  "recipient_email" TEXT,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "provider_message_id" TEXT,
  "failure_code" TEXT,
  "attempt_token" TEXT,
  "attempt_started_at" TIMESTAMP(3),
  "attempted_at" TIMESTAMP(3),
  "sent_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FestivalWorkflowNotification_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FestivalWorkflowNotification_revision_nonnegative" CHECK ("workflow_revision" >= 0),
  CONSTRAINT "FestivalWorkflowNotification_attempts_nonnegative" CHECK ("attempts" >= 0)
);
CREATE UNIQUE INDEX "FestivalWorkflowNotification_attempt_token_key" ON "FestivalWorkflowNotification"("attempt_token");
CREATE UNIQUE INDEX "FestivalWorkflowNotification_festival_id_workflow_revision_audience_key" ON "FestivalWorkflowNotification"("festival_id", "workflow_revision", "audience");
CREATE INDEX "FestivalWorkflowNotification_delivery_status_created_at_idx" ON "FestivalWorkflowNotification"("delivery_status", "created_at");
ALTER TABLE "FestivalWorkflowNotification" ADD CONSTRAINT "FestivalWorkflowNotification_festival_id_fkey" FOREIGN KEY ("festival_id") REFERENCES "Festival"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "FestivalAsset" ADD CONSTRAINT "FestivalAsset_reviewed_by_user_id_fkey"
FOREIGN KEY ("reviewed_by_user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FestivalAsset"
  ADD CONSTRAINT "FestivalAsset_editorial_review_consistency" CHECK (
    ("editorial_status" = 'pending' AND "reviewed_by_user_id" IS NULL AND "reviewed_at" IS NULL)
    OR ("editorial_status" IN ('approved', 'rejected') AND "reviewed_by_user_id" IS NOT NULL AND "reviewed_at" IS NOT NULL)
  ),
  ADD CONSTRAINT "FestivalAsset_alt_text_nonblank" CHECK (length(btrim("alt_text")) > 0);

DROP INDEX IF EXISTS "FestivalAsset_festival_id_lifecycle_status_created_at_idx";
CREATE INDEX "FestivalAsset_festival_id_lifecycle_status_editorial_status_created_at_idx"
ON "FestivalAsset"("festival_id", "lifecycle_status", "editorial_status", "created_at");

-- A workflow outbox row cannot drift away from the transition it reports.
ALTER TABLE "FestivalWorkflowNotification" ADD CONSTRAINT "FestivalWorkflowNotification_transition_fkey"
FOREIGN KEY ("festival_id", "workflow_revision")
REFERENCES "FestivalTransition"("festival_id", "revision") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FestivalWorkflowNotification"
  ADD CONSTRAINT "FestivalWorkflowNotification_attempts_bounded" CHECK ("attempts" BETWEEN 0 AND 5),
  ADD CONSTRAINT "FestivalWorkflowNotification_delivery_consistency" CHECK (
    ("delivery_status" = 'sent' AND "sent_at" IS NOT NULL AND "failure_code" IS NULL AND "attempt_token" IS NULL AND "attempt_started_at" IS NULL)
    OR ("delivery_status" = 'failed' AND "sent_at" IS NULL AND "failure_code" IS NOT NULL AND "attempt_token" IS NULL AND "attempt_started_at" IS NULL)
    OR ("delivery_status" = 'pending' AND "sent_at" IS NULL AND "failure_code" IS NULL
      AND (("attempt_token" IS NULL AND "attempt_started_at" IS NULL) OR ("attempt_token" IS NOT NULL AND "attempt_started_at" IS NOT NULL)))
  );

CREATE OR REPLACE FUNCTION "validate_festival_audit_at_commit"()
RETURNS TRIGGER AS $$
DECLARE
  transition_row "FestivalTransition"%ROWTYPE;
  actor_role TEXT;
  snapshot_row "FestivalRevision"%ROWTYPE;
  matching_count INTEGER;
  prior_state "FestivalWorkflowState";
  expected_snapshot JSONB;
  snapshot_fields TEXT[] := ARRAY[
    'id', 'name', 'slug', 'description', 'location', 'city', 'state', 'zip_code',
    'website_url', 'logo_url', 'image_url', 'rejection_reason', 'submitted_by',
    'contact_name', 'contact_email', 'contact_phone', 'host_name', 'host_title',
    'host_about', 'host_social', 'social_instagram', 'social_facebook',
    'social_twitter', 'social_tiktok', 'social_youtube', 'festival_age',
    'festival_age_details', 'org_type', 'story', 'mission', 'history',
    'calendar_date_type', 'time_zone', 'start_date', 'end_date', 'all_day_start',
    'all_day_end', 'calendar_status', 'calendar_sequence', 'calendar_published_at',
    'first_published_at', 'published_at', 'canceled_at', 'public_message',
    'workflow_state', 'revision'
  ];
  snapshot_date_fields TEXT[] := ARRAY[
    'start_date', 'end_date', 'all_day_start', 'all_day_end',
    'calendar_published_at', 'first_published_at', 'published_at', 'canceled_at'
  ];
BEGIN
  IF TG_OP = 'INSERT' THEN
    prior_state := NULL;
    IF NEW."revision" <> 0 THEN
      RAISE EXCEPTION 'Initial festival revision must be zero' USING ERRCODE = 'check_violation';
    END IF;
  ELSE
    prior_state := OLD."workflow_state";
    IF NEW."revision" <> OLD."revision" + 1 THEN
      RAISE EXCEPTION 'Festival revision changes must increment exactly once' USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  SELECT count(*), min(transition."id")
  INTO matching_count, transition_row."id"
  FROM "FestivalTransition" transition
  WHERE transition."festival_id" = NEW."id"
    AND transition."revision" = NEW."revision"
    AND transition."from_state" IS NOT DISTINCT FROM prior_state
    AND transition."to_state" = NEW."workflow_state";
  IF matching_count <> 1 THEN
    RAISE EXCEPTION 'Festival revision/state change requires exactly one matching transition' USING ERRCODE = 'check_violation';
  END IF;
  SELECT * INTO transition_row FROM "FestivalTransition" WHERE "id" = transition_row."id";
  SELECT "role" INTO actor_role FROM "User" WHERE "id" = transition_row."actor_user_id";

  IF actor_role = 'producer' THEN
    IF transition_row."actor_user_id" IS DISTINCT FROM NEW."owner_user_id"
      OR NOT (
        (TG_OP = 'INSERT' AND NEW."workflow_state" = 'draft')
        OR (TG_OP = 'UPDATE' AND prior_state IN ('draft', 'changes_requested') AND NEW."workflow_state" = prior_state)
        OR (TG_OP = 'UPDATE' AND prior_state IN ('draft', 'changes_requested') AND NEW."workflow_state" = 'pending_review')
      ) THEN
      RAISE EXCEPTION 'Producer actor may create/edit owned drafts or submit/resubmit only' USING ERRCODE = 'check_violation';
    END IF;
    IF transition_row."reason" IS NOT NULL OR transition_row."producer_message" IS NOT NULL OR transition_row."public_message" IS NOT NULL THEN
      RAISE EXCEPTION 'Producer transitions cannot write editorial messages' USING ERRCODE = 'check_violation';
    END IF;
  ELSIF actor_role NOT IN ('admin', 'super_admin')
    OR (TG_OP = 'UPDATE' AND NEW."workflow_state" = prior_state) THEN
    RAISE EXCEPTION 'Editorial transition requires an admin or super_admin actor' USING ERRCODE = 'check_violation';
  END IF;

  IF actor_role IN ('admin', 'super_admin')
    AND NEW."workflow_state" IN ('changes_requested', 'rejected', 'canceled', 'archived')
    AND length(btrim(COALESCE(transition_row."reason", ''))) = 0 THEN
    RAISE EXCEPTION 'Transition requires a nonblank internal reason' USING ERRCODE = 'check_violation';
  END IF;
  IF actor_role IN ('admin', 'super_admin')
    AND NEW."workflow_state" IN ('changes_requested', 'rejected')
    AND length(btrim(COALESCE(transition_row."producer_message", ''))) = 0 THEN
    RAISE EXCEPTION 'Transition requires a nonblank producer message' USING ERRCODE = 'check_violation';
  END IF;
  IF NEW."workflow_state" = 'canceled'
    AND length(btrim(COALESCE(transition_row."public_message", ''))) = 0 THEN
    RAISE EXCEPTION 'Cancellation requires a nonblank public message' USING ERRCODE = 'check_violation';
  END IF;
  IF NEW."workflow_state" <> 'canceled' AND transition_row."public_message" IS NOT NULL THEN
    RAISE EXCEPTION 'Public transition message is cancellation-only' USING ERRCODE = 'check_violation';
  END IF;

  SELECT count(*), min(revision."id") INTO matching_count, snapshot_row."id"
  FROM "FestivalRevision" revision
  WHERE revision."festival_id" = NEW."id"
    AND revision."workflow_revision" = NEW."revision"
    AND revision."transition_id" = transition_row."id"
    AND revision."actor_user_id" = transition_row."actor_user_id";
  IF matching_count <> 1 THEN
    RAISE EXCEPTION 'Festival change requires exactly one matching immutable revision snapshot' USING ERRCODE = 'check_violation';
  END IF;
  SELECT * INTO snapshot_row FROM "FestivalRevision" WHERE "id" = snapshot_row."id";

  IF NOT snapshot_row."snapshot" ?& snapshot_fields
    OR (SELECT count(*) FROM jsonb_object_keys(snapshot_row."snapshot")) <> cardinality(snapshot_fields) THEN
    RAISE EXCEPTION 'Festival revision snapshot keys must exactly match the approved scalar allowlist' USING ERRCODE = 'check_violation';
  END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_each(snapshot_row."snapshot") AS entry(name, value)
    WHERE jsonb_typeof(entry.value) IN ('object', 'array')
  ) THEN
    RAISE EXCEPTION 'Festival revision snapshot values must be scalar' USING ERRCODE = 'check_violation';
  END IF;

  SELECT jsonb_object_agg(entry.name, entry.value)
  INTO expected_snapshot
  FROM jsonb_each(to_jsonb(NEW)) AS entry(name, value)
  WHERE entry.name = ANY(snapshot_fields);

  IF (snapshot_row."snapshot" - snapshot_date_fields)
      IS DISTINCT FROM (expected_snapshot - snapshot_date_fields)
    OR (snapshot_row."snapshot"->>'start_date')::TIMESTAMP(3) IS DISTINCT FROM NEW."start_date"
    OR (snapshot_row."snapshot"->>'end_date')::TIMESTAMP(3) IS DISTINCT FROM NEW."end_date"
    OR (snapshot_row."snapshot"->>'all_day_start')::DATE IS DISTINCT FROM NEW."all_day_start"
    OR (snapshot_row."snapshot"->>'all_day_end')::DATE IS DISTINCT FROM NEW."all_day_end"
    OR (snapshot_row."snapshot"->>'calendar_published_at')::TIMESTAMP(3) IS DISTINCT FROM NEW."calendar_published_at"
    OR (snapshot_row."snapshot"->>'first_published_at')::TIMESTAMP(3) IS DISTINCT FROM NEW."first_published_at"
    OR (snapshot_row."snapshot"->>'published_at')::TIMESTAMP(3) IS DISTINCT FROM NEW."published_at"
    OR (snapshot_row."snapshot"->>'canceled_at')::TIMESTAMP(3) IS DISTINCT FROM NEW."canceled_at" THEN
    RAISE EXCEPTION 'Festival revision snapshot does not match approved festival scalar fields' USING ERRCODE = 'check_violation';
  END IF;

  IF NEW."owner_user_id" IS NOT NULL AND actor_role IN ('admin', 'super_admin') THEN
    SELECT count(*) INTO matching_count FROM "FestivalWorkflowNotification"
    WHERE "festival_id" = NEW."id" AND "workflow_revision" = NEW."revision" AND "audience" = 'producer';
    IF matching_count <> 1 THEN
      RAISE EXCEPTION 'Owned editorial transition requires exactly one workflow notification' USING ERRCODE = 'check_violation';
    END IF;
  ELSIF NEW."owner_user_id" IS NOT NULL AND actor_role = 'producer'
    AND NEW."workflow_state" = 'pending_review' AND prior_state IS DISTINCT FROM 'pending_review' THEN
    SELECT count(*) INTO matching_count FROM "ProducerSubmissionNotification"
    WHERE "festival_id" = NEW."id" AND "workflow_revision" = NEW."revision";
    IF matching_count <> 2 OR NOT EXISTS (
      SELECT 1 FROM "ProducerSubmissionNotification" WHERE "festival_id" = NEW."id" AND "workflow_revision" = NEW."revision" AND "notification_type" = 'producer_receipt'
    ) OR NOT EXISTS (
      SELECT 1 FROM "ProducerSubmissionNotification" WHERE "festival_id" = NEW."id" AND "workflow_revision" = NEW."revision" AND "notification_type" = 'team_notification'
    ) THEN
      RAISE EXCEPTION 'Producer submission requires receipt and team notification outbox rows' USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER "Festival_audit_insert_commit_trigger"
AFTER INSERT ON "Festival"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION "validate_festival_audit_at_commit"();

CREATE CONSTRAINT TRIGGER "Festival_audit_commit_trigger"
AFTER UPDATE ON "Festival"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
WHEN (OLD."revision" IS DISTINCT FROM NEW."revision" OR OLD."workflow_state" IS DISTINCT FROM NEW."workflow_state")
EXECUTE FUNCTION "validate_festival_audit_at_commit"();

CREATE OR REPLACE FUNCTION "assert_live_festival_primary_occurrence"(affected_festival_id TEXT)
RETURNS VOID AS $$
DECLARE
  live_state BOOLEAN;
  primary_count INTEGER;
BEGIN
  SELECT ("workflow_state" = 'published' OR ("workflow_state" = 'canceled' AND "first_published_at" IS NOT NULL))
  INTO live_state FROM "Festival" WHERE "id" = affected_festival_id;
  IF COALESCE(live_state, FALSE) THEN
    SELECT count(*) INTO primary_count FROM "FestivalOccurrence"
    WHERE "festival_id" = affected_festival_id AND "is_primary";
    IF primary_count <> 1 THEN
      RAISE EXCEPTION 'Published or public canceled festival requires exactly one valid primary occurrence' USING ERRCODE = 'check_violation';
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION "validate_live_festival_primary_occurrence_at_commit"()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_TABLE_NAME = 'Festival' THEN
    PERFORM "assert_live_festival_primary_occurrence"(NEW."id");
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM "assert_live_festival_primary_occurrence"(OLD."festival_id");
  ELSE
    PERFORM "assert_live_festival_primary_occurrence"(NEW."festival_id");
    IF TG_OP = 'UPDATE' AND OLD."festival_id" IS DISTINCT FROM NEW."festival_id" THEN
      PERFORM "assert_live_festival_primary_occurrence"(OLD."festival_id");
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER "Festival_live_primary_occurrence_commit_trigger"
AFTER INSERT OR UPDATE ON "Festival"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION "validate_live_festival_primary_occurrence_at_commit"();
CREATE CONSTRAINT TRIGGER "FestivalOccurrence_live_primary_commit_trigger"
AFTER INSERT OR UPDATE OR DELETE ON "FestivalOccurrence"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION "validate_live_festival_primary_occurrence_at_commit"();
