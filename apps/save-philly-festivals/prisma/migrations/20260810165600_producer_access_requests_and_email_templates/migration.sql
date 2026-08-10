-- CreateEnum
CREATE TYPE "ProducerAccessRequestStatus" AS ENUM ('pending', 'approved', 'rejected', 'withdrawn');

-- CreateTable
CREATE TABLE "ProducerAccessRequest" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" "ProducerAccessRequestStatus" NOT NULL DEFAULT 'pending',
    "organization" TEXT,
    "festival_name" TEXT,
    "message" TEXT,
    "decided_by_user_id" TEXT,
    "decided_at" TIMESTAMP(3),
    "decision_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProducerAccessRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailTemplate" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "description" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "updated_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProducerAccessRequest_status_created_at_idx" ON "ProducerAccessRequest"("status", "created_at");

-- CreateIndex
CREATE INDEX "ProducerAccessRequest_user_id_status_idx" ON "ProducerAccessRequest"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "EmailTemplate_key_key" ON "EmailTemplate"("key");

-- CreateIndex
CREATE INDEX "EmailTemplate_key_idx" ON "EmailTemplate"("key");

-- AddForeignKey
ALTER TABLE "ProducerAccessRequest" ADD CONSTRAINT "ProducerAccessRequest_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProducerAccessRequest" ADD CONSTRAINT "ProducerAccessRequest_decided_by_user_id_fkey" FOREIGN KEY ("decided_by_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- One open request per account. Prisma cannot express a partial unique index, so it is added
-- here: without it, a producer clicking "Request access" twice queues duplicate rows for the
-- reviewer and makes "approve" ambiguous. Decided rows (approved/rejected/withdrawn) are
-- unconstrained so the history of past requests is preserved.
CREATE UNIQUE INDEX "ProducerAccessRequest_one_open_per_user"
  ON "ProducerAccessRequest" ("user_id")
  WHERE "status" = 'pending';
