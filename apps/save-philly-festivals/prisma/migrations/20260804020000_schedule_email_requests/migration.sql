-- CreateEnum
CREATE TYPE "ScheduleEmailDeliveryStatus" AS ENUM ('pending', 'sent', 'failed');

-- CreateEnum
CREATE TYPE "ScheduleEmailItemType" AS ENUM ('festival', 'event');

-- CreateEnum
CREATE TYPE "ScheduleEmailResolutionStatus" AS ENUM ('resolved', 'unavailable');

-- CreateTable
CREATE TABLE "ScheduleEmailRequest" (
    "id" TEXT NOT NULL,
    "recipient_email" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "selection_version" INTEGER NOT NULL,
    "delivery_status" "ScheduleEmailDeliveryStatus" NOT NULL DEFAULT 'pending',
    "provider_message_id" TEXT,
    "failure_code" TEXT,
    "failure_message" TEXT,
    "attempted_at" TIMESTAMP(3),
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduleEmailRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleEmailItem" (
    "id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "item_type" "ScheduleEmailItemType" NOT NULL,
    "item_id" TEXT NOT NULL,
    "resolution_status" "ScheduleEmailResolutionStatus" NOT NULL,

    CONSTRAINT "ScheduleEmailItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ScheduleEmailRequest_idempotency_key_key" ON "ScheduleEmailRequest"("idempotency_key");

-- CreateIndex
CREATE INDEX "ScheduleEmailRequest_recipient_email_idx" ON "ScheduleEmailRequest"("recipient_email");

-- CreateIndex
CREATE INDEX "ScheduleEmailRequest_delivery_status_created_at_idx" ON "ScheduleEmailRequest"("delivery_status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "ScheduleEmailItem_request_id_position_key" ON "ScheduleEmailItem"("request_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "ScheduleEmailItem_request_id_item_type_item_id_key" ON "ScheduleEmailItem"("request_id", "item_type", "item_id");

-- CreateIndex
CREATE INDEX "ScheduleEmailItem_item_type_item_id_idx" ON "ScheduleEmailItem"("item_type", "item_id");

-- AddForeignKey
ALTER TABLE "ScheduleEmailItem" ADD CONSTRAINT "ScheduleEmailItem_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "ScheduleEmailRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
