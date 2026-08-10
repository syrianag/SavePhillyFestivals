-- Permit editor content corrections without a workflow state change.
--
-- Before this, `validate_festival_audit_at_commit` rejected any admin transition whose
-- `workflow_state` equalled the prior state. Combined with the audit trigger firing on every
-- revision bump, that made it impossible for an editor to correct a festival's content at all:
-- the producer patch endpoint is scoped to the owner and to draft/changes_requested, and the
-- 405 CSV-imported festivals are published with no owner. A typo in an imported listing was
-- unfixable through any surface.
--
-- The invariant this clause protected was "an editor cannot silently mutate a festival" — the
-- state change was what made the edit visible. That protection is preserved by a different
-- means: a same-state editor edit is now allowed only when the accompanying FestivalTransition
-- carries a nonblank internal reason. Every such edit still writes a FestivalTransition and a
-- FestivalRevision snapshot, so the audit trail remains complete and attributable.
--
-- Unchanged: producers still may not make same-state edits outside their own drafts; the
-- owned-festival notification requirement still applies, so editing a producer-owned festival
-- still writes a workflow notification outbox row.

CREATE OR REPLACE FUNCTION public.validate_festival_audit_at_commit()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
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
    OR (
      TG_OP = 'UPDATE' AND NEW."workflow_state" = prior_state
      AND length(btrim(COALESCE(transition_row."reason", ''))) = 0
    ) THEN
    RAISE EXCEPTION 'Editorial transition requires an admin or super_admin actor, and a same-state content edit requires a nonblank internal reason' USING ERRCODE = 'check_violation';
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
$function$
;
