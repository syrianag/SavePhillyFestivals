-- Combined "become a producer and submit an event" flow.
--
-- The application carries its event as submitted JSON, not as a `Festival` row:
-- `validate_festival_audit_at_commit` only accepts a festival insert whose transition actor is an
-- owning `producer` or an admin, and an applicant is neither until approved. The real festival
-- is created on approval, with the deciding admin as the actor, and linked back via
-- `festival_id`. Both columns are nullable — the original two-step flow carries neither.

ALTER TABLE "ProducerAccessRequest" ADD COLUMN "proposed_festival" JSONB;
ALTER TABLE "ProducerAccessRequest" ADD COLUMN "festival_id" TEXT;

-- One request per festival: a draft created by an application belongs to that application only.
CREATE UNIQUE INDEX "ProducerAccessRequest_festival_id_key"
    ON "ProducerAccessRequest"("festival_id");

-- SET NULL rather than CASCADE: deleting a festival must not erase the audit record of who
-- applied for producer access and how that application was decided.
ALTER TABLE "ProducerAccessRequest"
    ADD CONSTRAINT "ProducerAccessRequest_festival_id_fkey"
    FOREIGN KEY ("festival_id") REFERENCES "Festival"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
