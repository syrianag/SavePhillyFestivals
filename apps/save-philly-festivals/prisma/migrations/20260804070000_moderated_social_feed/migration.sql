-- F-09 moderated social feed. Provider credentials remain server-side; PostgreSQL stores
-- only normalized configuration, text-card metadata, sync state, and immutable moderation.

CREATE TYPE "SocialFeedProvider" AS ENUM ('curator', 'flockler');
CREATE TYPE "SocialFeedSyncStatus" AS ENUM ('never', 'success', 'failed');
CREATE TYPE "SocialNetwork" AS ENUM ('instagram', 'x', 'facebook', 'tiktok', 'youtube', 'other');
CREATE TYPE "SocialPostModerationStatus" AS ENUM ('pending', 'approved', 'hidden', 'rejected');

CREATE TABLE "FestivalSocialFeed" (
  "id" TEXT NOT NULL,
  "festival_id" TEXT NOT NULL,
  "hashtag" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT FALSE,
  "provider" "SocialFeedProvider" NOT NULL,
  "provider_feed_id" TEXT NOT NULL,
  "revision" INTEGER NOT NULL DEFAULT 0,
  "source_revision" INTEGER NOT NULL DEFAULT 1,
  "sync_cursor" TEXT,
  "sync_attempt_token" TEXT,
  "sync_attempt_started_at" TIMESTAMP(3),
  "last_sync_status" "SocialFeedSyncStatus" NOT NULL DEFAULT 'never',
  "last_attempted_at" TIMESTAMP(3),
  "last_success_at" TIMESTAMP(3),
  "last_error_code" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FestivalSocialFeed_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FestivalSocialFeed_revision_nonnegative" CHECK ("revision" >= 0),
  CONSTRAINT "FestivalSocialFeed_source_revision_positive" CHECK ("source_revision" > 0),
  CONSTRAINT "FestivalSocialFeed_hashtag_normalized" CHECK (
    char_length("hashtag") BETWEEN 1 AND 100
    AND "hashtag" = btrim("hashtag")
    AND left("hashtag", 1) <> '#'
    AND "hashtag" ~ '^[[:alnum:]_]+$'
  ),
  CONSTRAINT "FestivalSocialFeed_provider_feed_id_safe" CHECK (
    char_length("provider_feed_id") BETWEEN 1 AND 200
    AND "provider_feed_id" ~ '^[A-Za-z0-9._:-]+$'
  ),
  CONSTRAINT "FestivalSocialFeed_error_code_redacted" CHECK (
    "last_error_code" IS NULL OR "last_error_code" ~ '^[a-z0-9_]{1,80}$'
  ),
  CONSTRAINT "FestivalSocialFeed_sync_attempt_coherence" CHECK (
    ("sync_attempt_token" IS NULL AND "sync_attempt_started_at" IS NULL)
    OR ("sync_attempt_token" ~ '^[A-Za-z0-9_-]{16,200}$' AND "sync_attempt_started_at" IS NOT NULL)
  )
);

CREATE TABLE "SocialPost" (
  "id" TEXT NOT NULL,
  "social_feed_id" TEXT NOT NULL,
  "provider_item_id" TEXT NOT NULL,
  "source_revision" INTEGER NOT NULL DEFAULT 1,
  "network" "SocialNetwork" NOT NULL,
  "canonical_url" TEXT NOT NULL,
  "author_name" TEXT,
  "author_handle" TEXT,
  "text_excerpt" TEXT NOT NULL,
  "source_published_at" TIMESTAMP(3),
  "moderation_status" "SocialPostModerationStatus" NOT NULL DEFAULT 'pending',
  "moderation_revision" INTEGER NOT NULL DEFAULT 0,
  "reviewed_by_user_id" TEXT,
  "reviewed_at" TIMESTAMP(3),
  "ingested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SocialPost_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SocialPost_moderation_revision_nonnegative" CHECK ("moderation_revision" >= 0),
  CONSTRAINT "SocialPost_source_revision_positive" CHECK ("source_revision" > 0),
  CONSTRAINT "SocialPost_provider_item_id_bounded" CHECK (char_length("provider_item_id") BETWEEN 1 AND 300),
  CONSTRAINT "SocialPost_canonical_url_bounded" CHECK (char_length("canonical_url") BETWEEN 10 AND 2048),
  CONSTRAINT "SocialPost_text_excerpt_bounded" CHECK (char_length("text_excerpt") BETWEEN 1 AND 1000),
  CONSTRAINT "SocialPost_author_name_bounded" CHECK ("author_name" IS NULL OR char_length("author_name") <= 200),
  CONSTRAINT "SocialPost_author_handle_bounded" CHECK ("author_handle" IS NULL OR char_length("author_handle") <= 200),
  CONSTRAINT "SocialPost_review_coherence" CHECK (
    ("moderation_status" = 'pending' AND "reviewed_by_user_id" IS NULL AND "reviewed_at" IS NULL)
    OR
    ("moderation_status" <> 'pending' AND "reviewed_by_user_id" IS NOT NULL AND "reviewed_at" IS NOT NULL)
  )
);

CREATE TABLE "SocialPostModerationTransition" (
  "id" TEXT NOT NULL,
  "social_post_id" TEXT NOT NULL,
  "actor_user_id" TEXT NOT NULL,
  "from_status" "SocialPostModerationStatus" NOT NULL,
  "to_status" "SocialPostModerationStatus" NOT NULL,
  "revision" INTEGER NOT NULL,
  "reason" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SocialPostModerationTransition_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SocialPostModerationTransition_revision_positive" CHECK ("revision" > 0),
  CONSTRAINT "SocialPostModerationTransition_status_changed" CHECK ("from_status" <> "to_status"),
  CONSTRAINT "SocialPostModerationTransition_reason_bounded" CHECK ("reason" IS NULL OR char_length("reason") BETWEEN 1 AND 1000),
  CONSTRAINT "SocialPostModerationTransition_reason_required" CHECK (
    "to_status" NOT IN ('hidden', 'rejected') OR "reason" IS NOT NULL
  )
);

CREATE UNIQUE INDEX "FestivalSocialFeed_festival_id_key" ON "FestivalSocialFeed"("festival_id");
CREATE INDEX "FestivalSocialFeed_enabled_last_sync_status_updated_at_idx" ON "FestivalSocialFeed"("enabled", "last_sync_status", "updated_at");
CREATE UNIQUE INDEX "SocialPost_social_feed_id_source_revision_provider_item_id_key" ON "SocialPost"("social_feed_id", "source_revision", "provider_item_id");
CREATE INDEX "SocialPost_social_feed_id_source_revision_moderation_status_source_published_at_id_idx" ON "SocialPost"("social_feed_id", "source_revision", "moderation_status", "source_published_at", "id");
CREATE INDEX "SocialPost_reviewed_by_user_id_reviewed_at_idx" ON "SocialPost"("reviewed_by_user_id", "reviewed_at");
CREATE UNIQUE INDEX "SocialPostModerationTransition_social_post_id_revision_key" ON "SocialPostModerationTransition"("social_post_id", "revision");
CREATE INDEX "SocialPostModerationTransition_actor_user_id_created_at_idx" ON "SocialPostModerationTransition"("actor_user_id", "created_at");

ALTER TABLE "FestivalSocialFeed" ADD CONSTRAINT "FestivalSocialFeed_festival_id_fkey"
FOREIGN KEY ("festival_id") REFERENCES "Festival"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SocialPost" ADD CONSTRAINT "SocialPost_social_feed_id_fkey"
FOREIGN KEY ("social_feed_id") REFERENCES "FestivalSocialFeed"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SocialPost" ADD CONSTRAINT "SocialPost_reviewed_by_user_id_fkey"
FOREIGN KEY ("reviewed_by_user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SocialPostModerationTransition" ADD CONSTRAINT "SocialPostModerationTransition_social_post_id_fkey"
FOREIGN KEY ("social_post_id") REFERENCES "SocialPost"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SocialPostModerationTransition" ADD CONSTRAINT "SocialPostModerationTransition_actor_user_id_fkey"
FOREIGN KEY ("actor_user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION "prevent_social_post_moderation_audit_mutation"()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Social post moderation transitions are immutable' USING ERRCODE = 'check_violation';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "SocialPostModerationTransition_immutable_trigger"
BEFORE UPDATE OR DELETE ON "SocialPostModerationTransition"
FOR EACH ROW EXECUTE FUNCTION "prevent_social_post_moderation_audit_mutation"();

CREATE FUNCTION "enforce_social_post_moderation_revision"()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW."moderation_status" <> 'pending' OR NEW."moderation_revision" <> 0 OR NEW."reviewed_by_user_id" IS NOT NULL OR NEW."reviewed_at" IS NOT NULL THEN
      RAISE EXCEPTION 'New social posts must enter pending moderation at revision zero' USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW."social_feed_id" <> OLD."social_feed_id" OR NEW."source_revision" <> OLD."source_revision" OR NEW."provider_item_id" <> OLD."provider_item_id" THEN
    RAISE EXCEPTION 'Social post source identity is immutable' USING ERRCODE = 'check_violation';
  END IF;

  IF (OLD."moderation_status" <> 'pending' OR NEW."moderation_status" <> 'pending') AND (
    NEW."network" IS DISTINCT FROM OLD."network"
    OR NEW."canonical_url" IS DISTINCT FROM OLD."canonical_url"
    OR NEW."author_name" IS DISTINCT FROM OLD."author_name"
    OR NEW."author_handle" IS DISTINCT FROM OLD."author_handle"
    OR NEW."text_excerpt" IS DISTINCT FROM OLD."text_excerpt"
    OR NEW."source_published_at" IS DISTINCT FROM OLD."source_published_at"
  ) THEN
    RAISE EXCEPTION 'Reviewed social post content is immutable' USING ERRCODE = 'check_violation';
  END IF;

  IF NEW."moderation_status" IS NOT DISTINCT FROM OLD."moderation_status" AND (
    NEW."reviewed_by_user_id" IS DISTINCT FROM OLD."reviewed_by_user_id"
    OR NEW."reviewed_at" IS DISTINCT FROM OLD."reviewed_at"
  ) THEN
    RAISE EXCEPTION 'Social post review attribution cannot change without a status transition' USING ERRCODE = 'check_violation';
  END IF;

  IF NEW."moderation_status" IS DISTINCT FROM OLD."moderation_status" THEN
    IF NEW."moderation_revision" <> OLD."moderation_revision" + 1 THEN
      RAISE EXCEPTION 'Social post moderation revisions must increment by exactly one' USING ERRCODE = 'check_violation';
    END IF;
  ELSIF NEW."moderation_revision" <> OLD."moderation_revision" THEN
    RAISE EXCEPTION 'Social post moderation revision cannot change without a status transition' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "SocialPost_moderation_revision_trigger"
BEFORE INSERT OR UPDATE ON "SocialPost"
FOR EACH ROW EXECUTE FUNCTION "enforce_social_post_moderation_revision"();

CREATE FUNCTION "verify_social_post_moderation_audit"()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."moderation_status" IS DISTINCT FROM OLD."moderation_status" AND NOT EXISTS (
    SELECT 1
    FROM "SocialPostModerationTransition" transition
    WHERE transition."social_post_id" = NEW."id"
      AND transition."from_status" = OLD."moderation_status"
      AND transition."to_status" = NEW."moderation_status"
      AND transition."revision" = NEW."moderation_revision"
      AND transition."actor_user_id" = NEW."reviewed_by_user_id"
  ) THEN
    RAISE EXCEPTION 'Social post moderation change requires a matching immutable audit transition' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER "SocialPost_moderation_audit_commit_trigger"
AFTER UPDATE ON "SocialPost"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION "verify_social_post_moderation_audit"();

CREATE FUNCTION "verify_social_post_moderation_transition"()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "SocialPost" post
    WHERE post."id" = NEW."social_post_id"
      AND post."moderation_status" = NEW."to_status"
      AND post."moderation_revision" = NEW."revision"
      AND post."reviewed_by_user_id" = NEW."actor_user_id"
  ) THEN
    RAISE EXCEPTION 'Social post moderation transition requires a matching post state' USING ERRCODE = 'check_violation';
  END IF;

  IF NEW."revision" = 1 AND NEW."from_status" <> 'pending' THEN
    RAISE EXCEPTION 'First social post moderation transition must start from pending' USING ERRCODE = 'check_violation';
  ELSIF NEW."revision" > 1 AND NOT EXISTS (
    SELECT 1 FROM "SocialPostModerationTransition" previous
    WHERE previous."social_post_id" = NEW."social_post_id"
      AND previous."revision" = NEW."revision" - 1
      AND previous."to_status" = NEW."from_status"
  ) THEN
    RAISE EXCEPTION 'Social post moderation transition chain is incomplete' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER "SocialPostModerationTransition_coherence_commit_trigger"
AFTER INSERT ON "SocialPostModerationTransition"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION "verify_social_post_moderation_transition"();
