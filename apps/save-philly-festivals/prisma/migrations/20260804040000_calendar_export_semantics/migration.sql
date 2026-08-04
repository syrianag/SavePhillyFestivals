-- CreateEnum
CREATE TYPE "CalendarDateType" AS ENUM ('timed', 'all_day');

-- CreateEnum
CREATE TYPE "CalendarStatus" AS ENUM ('confirmed', 'tentative', 'postponed', 'canceled');

-- AlterTable
ALTER TABLE "Festival"
ADD COLUMN "calendar_date_type" "CalendarDateType" NOT NULL DEFAULT 'timed',
ADD COLUMN "time_zone" TEXT NOT NULL DEFAULT 'America/New_York',
ADD COLUMN "all_day_start" DATE,
ADD COLUMN "all_day_end" DATE,
ADD COLUMN "calendar_status" "CalendarStatus" NOT NULL DEFAULT 'confirmed',
ADD COLUMN "calendar_sequence" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "calendar_published_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Schedule"
ALTER COLUMN "start_time" DROP NOT NULL,
ALTER COLUMN "end_time" DROP NOT NULL,
ADD COLUMN "calendar_date_type" "CalendarDateType" NOT NULL DEFAULT 'timed',
ADD COLUMN "time_zone" TEXT NOT NULL DEFAULT 'America/New_York',
ADD COLUMN "all_day_start" DATE,
ADD COLUMN "all_day_end" DATE,
ADD COLUMN "calendar_status" "CalendarStatus" NOT NULL DEFAULT 'confirmed',
ADD COLUMN "calendar_sequence" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "calendar_published_at" TIMESTAMP(3);

-- Existing approved records were already public before calendar metadata existed.
UPDATE "Festival"
SET "calendar_published_at" = COALESCE("updated_at", "created_at")
WHERE "status" = 'approved';

UPDATE "Schedule" AS schedule
SET "calendar_published_at" = COALESCE(schedule."updated_at", schedule."created_at")
FROM "Festival" AS festival
WHERE schedule."festival_id" = festival."id"
  AND festival."status" = 'approved';

-- Calendar data remains Philadelphia-specific for the current product scope.
ALTER TABLE "Festival"
ADD CONSTRAINT "Festival_calendar_sequence_nonnegative" CHECK ("calendar_sequence" >= 0),
ADD CONSTRAINT "Festival_calendar_time_zone" CHECK ("time_zone" = 'America/New_York'),
ADD CONSTRAINT "Festival_calendar_timed_interval" CHECK (
  "calendar_date_type" <> 'timed'
  OR "start_date" IS NULL
  OR "end_date" IS NULL
  OR "end_date" > "start_date"
),
ADD CONSTRAINT "Festival_calendar_all_day_interval" CHECK (
  "calendar_date_type" <> 'all_day'
  OR "all_day_start" IS NULL
  OR "all_day_end" IS NULL
  OR "all_day_end" >= "all_day_start"
);

ALTER TABLE "Schedule"
ADD CONSTRAINT "Schedule_calendar_sequence_nonnegative" CHECK ("calendar_sequence" >= 0),
ADD CONSTRAINT "Schedule_calendar_time_zone" CHECK ("time_zone" = 'America/New_York'),
ADD CONSTRAINT "Schedule_calendar_timed_interval" CHECK (
  "calendar_date_type" <> 'timed'
  OR "start_time" IS NULL
  OR "end_time" IS NULL
  OR "end_time" > "start_time"
),
ADD CONSTRAINT "Schedule_calendar_all_day_interval" CHECK (
  "calendar_date_type" <> 'all_day'
  OR "all_day_start" IS NULL
  OR "all_day_end" IS NULL
  OR "all_day_end" >= "all_day_start"
);

-- Indexes support cancellation re-export and editorial calendar queues.
CREATE INDEX "Festival_calendar_status_calendar_published_at_idx"
ON "Festival"("calendar_status", "calendar_published_at");

CREATE INDEX "Schedule_calendar_status_calendar_published_at_idx"
ON "Schedule"("calendar_status", "calendar_published_at");

-- Keep stable calendar UIDs useful by advancing SEQUENCE for every
-- calendar-significant edit, regardless of which application path writes it.
CREATE FUNCTION "set_festival_calendar_metadata"()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW."calendar_sequence" := 0;
    IF NEW."status" = 'approved' THEN
      NEW."calendar_published_at" := COALESCE(NEW."updated_at", CURRENT_TIMESTAMP);
    ELSE
      NEW."calendar_published_at" := NULL;
    END IF;
  ELSE
    IF OLD."calendar_published_at" IS NOT NULL THEN
      NEW."calendar_published_at" := OLD."calendar_published_at";
    ELSIF NEW."status" = 'approved' THEN
      NEW."calendar_published_at" := COALESCE(NEW."updated_at", CURRENT_TIMESTAMP);
    ELSE
      NEW."calendar_published_at" := NULL;
    END IF;

    IF ROW(
      NEW."name", NEW."slug", NEW."description", NEW."location",
      NEW."start_date", NEW."end_date", NEW."calendar_date_type",
      NEW."time_zone", NEW."all_day_start", NEW."all_day_end",
      NEW."calendar_status"
    ) IS DISTINCT FROM ROW(
      OLD."name", OLD."slug", OLD."description", OLD."location",
      OLD."start_date", OLD."end_date", OLD."calendar_date_type",
      OLD."time_zone", OLD."all_day_start", OLD."all_day_end",
      OLD."calendar_status"
    ) THEN
      NEW."calendar_sequence" := OLD."calendar_sequence" + 1;
    ELSE
      NEW."calendar_sequence" := OLD."calendar_sequence";
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "Festival_calendar_metadata_trigger"
BEFORE INSERT OR UPDATE ON "Festival"
FOR EACH ROW EXECUTE FUNCTION "set_festival_calendar_metadata"();

CREATE FUNCTION "stamp_published_festival_schedules"()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."status" = 'approved' AND OLD."status" IS DISTINCT FROM 'approved' THEN
    UPDATE "Schedule"
    SET "calendar_published_at" = COALESCE("calendar_published_at", NEW."updated_at", CURRENT_TIMESTAMP)
    WHERE "festival_id" = NEW."id" AND "calendar_published_at" IS NULL;
  END IF;

  IF NEW."calendar_sequence" > OLD."calendar_sequence" THEN
    UPDATE "Schedule"
    SET
      "calendar_sequence" = "calendar_sequence" + 1,
      "updated_at" = GREATEST("updated_at", NEW."updated_at")
    WHERE "festival_id" = NEW."id";
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "Festival_stamp_published_schedules_trigger"
AFTER UPDATE ON "Festival"
FOR EACH ROW EXECUTE FUNCTION "stamp_published_festival_schedules"();

CREATE FUNCTION "set_schedule_calendar_metadata"()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW."calendar_sequence" := 0;
    IF EXISTS (
      SELECT 1 FROM "Festival"
      WHERE "id" = NEW."festival_id" AND "status" = 'approved'
    ) THEN
      NEW."calendar_published_at" := COALESCE(NEW."updated_at", CURRENT_TIMESTAMP);
    ELSE
      NEW."calendar_published_at" := NULL;
    END IF;
  ELSE
    IF OLD."calendar_published_at" IS NOT NULL THEN
      NEW."calendar_published_at" := OLD."calendar_published_at";
    ELSIF EXISTS (
      SELECT 1 FROM "Festival"
      WHERE "id" = NEW."festival_id" AND "status" = 'approved'
    ) THEN
      NEW."calendar_published_at" := COALESCE(NEW."updated_at", CURRENT_TIMESTAMP);
    ELSE
      NEW."calendar_published_at" := NULL;
    END IF;

    IF pg_trigger_depth() > 1 AND NEW."calendar_sequence" = OLD."calendar_sequence" + 1 THEN
      NEW."calendar_sequence" := OLD."calendar_sequence" + 1;
    ELSIF ROW(
      NEW."festival_id", NEW."title", NEW."description", NEW."location",
      NEW."start_time", NEW."end_time", NEW."calendar_date_type",
      NEW."time_zone", NEW."all_day_start", NEW."all_day_end",
      NEW."calendar_status"
    ) IS DISTINCT FROM ROW(
      OLD."festival_id", OLD."title", OLD."description", OLD."location",
      OLD."start_time", OLD."end_time", OLD."calendar_date_type",
      OLD."time_zone", OLD."all_day_start", OLD."all_day_end",
      OLD."calendar_status"
    ) THEN
      NEW."calendar_sequence" := OLD."calendar_sequence" + 1;
    ELSE
      NEW."calendar_sequence" := OLD."calendar_sequence";
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "Schedule_calendar_metadata_trigger"
BEFORE INSERT OR UPDATE ON "Schedule"
FOR EACH ROW EXECUTE FUNCTION "set_schedule_calendar_metadata"();
