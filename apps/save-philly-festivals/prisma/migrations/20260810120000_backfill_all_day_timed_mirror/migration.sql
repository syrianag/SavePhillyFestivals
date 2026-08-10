-- Backfill a timed mirror of the all-day date fields.
--
-- Why: the festival importer writes `all_day_start`/`all_day_end` (both `@db.Date`) and sets
-- `calendar_date_type = 'all_day'`, but leaves `start_date`/`end_date` NULL. Public discovery
-- selects, sorts, and filters on `start_date`, so every imported festival rendered as
-- "Dates TBD", sorted into the `NULLS LAST` bucket (making the catalog alphabetical rather
-- than chronological), and was dropped by every date filter.
--
-- Prisma cannot express `ORDER BY COALESCE(start_date, all_day_start)`, so mirroring the value
-- onto the timed columns is what makes the existing sort, the existing
-- `@@index([workflow_state, start_date, id])`, and `formatFestivalDate` all work unchanged.
-- `calendar_date_type` remains the discriminator, so ICS export and occurrence sync are
-- unaffected by this backfill.
--
-- The double `AT TIME ZONE` is deliberate and session-timezone independent: the inner cast
-- interprets the naive date as midnight in America/New_York, the outer one renders that instant
-- back to a naive UTC timestamp for the `timestamp without time zone` target columns.
--
-- `end_date` uses the INCLUSIVE final day (COALESCE to the start when no end is recorded), not
-- start-of-next-day. `formatFestivalDate` collapses a range whose formatted endpoints are equal,
-- so an exclusive +1 day bound would render every single-day festival as a two-day range.
--
-- Data-only migration: there is no schema diff, so `prisma migrate dev` will not generate it.
-- Idempotent — the WHERE clause skips any row that already carries a timed value.

-- Scope note: only the Festival table is mirrored. FestivalOccurrence is deliberately left
-- alone — ICS export branches on `calendar_date_type` (calendar-export-repository.js:61-62),
-- not on `start_at` presence, so writing the occurrence would add risk with no benefit.

UPDATE "Festival"
SET "start_date" = (("all_day_start"::timestamp AT TIME ZONE 'America/New_York') AT TIME ZONE 'UTC'),
    "end_date"   = ((COALESCE("all_day_end", "all_day_start")::timestamp AT TIME ZONE 'America/New_York') AT TIME ZONE 'UTC')
WHERE "start_date" IS NULL
  AND "all_day_start" IS NOT NULL;
