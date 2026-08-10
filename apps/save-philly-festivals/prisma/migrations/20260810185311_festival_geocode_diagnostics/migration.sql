-- AlterTable
ALTER TABLE "Festival" ADD COLUMN     "geocode_attempted_at" TIMESTAMP(3),
ADD COLUMN     "geocode_attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "geocode_failure_reason" TEXT,
ADD COLUMN     "geocode_status" TEXT,
ADD COLUMN     "geocoded_location" TEXT;

-- CreateIndex
CREATE INDEX "Festival_geocode_status_geocode_attempted_at_idx" ON "Festival"("geocode_status", "geocode_attempted_at");
