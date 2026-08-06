-- Add a bounded, fenced delivery lease so failed transactional schedule emails can retry safely.
ALTER TABLE "ScheduleEmailRequest"
  ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "attempt_token" TEXT,
  ADD COLUMN "attempt_started_at" TIMESTAMP(3),
  ADD CONSTRAINT "ScheduleEmailRequest_attempts_bounded" CHECK ("attempts" >= 0 AND "attempts" <= 3),
  ADD CONSTRAINT "ScheduleEmailRequest_attempt_lease_coherent" CHECK (
    ("attempt_token" IS NULL AND "attempt_started_at" IS NULL)
    OR ("attempt_token" IS NOT NULL AND "attempt_started_at" IS NOT NULL AND "delivery_status" = 'pending')
  );

CREATE UNIQUE INDEX "ScheduleEmailRequest_attempt_token_key"
ON "ScheduleEmailRequest"("attempt_token");

CREATE INDEX "ScheduleEmailRequest_delivery_status_attempt_started_at_idx"
ON "ScheduleEmailRequest"("delivery_status", "attempt_started_at");
