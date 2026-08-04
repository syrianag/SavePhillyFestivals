import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.ts";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const actorId = "00000000-0000-4000-8000-000000000001";
const pendingFestivalId = "00000000-0000-4000-8000-000000000102";
const marker = "f07-disposable-reconciliation-marker";
const now = new Date("2026-08-04T12:00:00.000Z");

try {
  await prisma.producerSubmissionNotification.create({
    data: {
      festival_id: pendingFestivalId,
      workflow_revision: 0,
      notification_type: "producer_receipt",
      recipient_email: "producer@example.test",
    },
  });
  const notificationClaim = await prisma.producerSubmissionNotification.updateMany({
    where: {
      festival_id: pendingFestivalId,
      workflow_revision: 0,
      notification_type: "producer_receipt",
      delivery_status: "pending",
      attempt_token: null,
    },
    data: {
      attempt_token: "f07-disposable-attempt-token",
      attempt_started_at: now,
      attempted_at: now,
      attempts: { increment: 1 },
    },
  });
  if (notificationClaim.count !== 1) throw new Error("Generated notification claim operation did not update one row.");

  await prisma.$transaction(async (transaction) => {
    const moderation = await transaction.festival.updateMany({
      where: {
        id: pendingFestivalId,
        workflow_state: "pending_review",
        status: "pending",
        revision: 0,
      },
      data: {
        workflow_state: "approved",
        status: "approved",
        revision: { increment: 1 },
      },
    });
    if (moderation.count !== 1) throw new Error("Generated conditional moderation operation did not update one row.");
    await transaction.festivalTransition.create({
      data: {
        festival_id: pendingFestivalId,
        actor_user_id: actorId,
        from_state: "pending_review",
        to_state: "approved",
        revision: 1,
      },
    });
  });

  await prisma.festivalAssetReconciliation.create({
    data: {
      reconciliation_marker: marker,
      provider_file_id: "f07-disposable-provider-file",
      server_filename: "f07-disposable-server.png",
      checksum_sha256: "a".repeat(64),
      cleanup_status: "failed",
      cleanup_attempts: 1,
      last_error_code: "provider_cleanup_failed",
      last_attempted_at: now,
    },
  });
  const reconciliationClaim = await prisma.festivalAssetReconciliation.updateMany({
    where: { reconciliation_marker: marker, cleanup_status: "failed" },
    data: { cleanup_status: "retrying", cleanup_attempts: { increment: 1 } },
  });
  if (reconciliationClaim.count !== 1) throw new Error("Generated reconciliation operation did not update one row.");

  const emailRequest = await prisma.scheduleEmailRequest.create({
    data: {
      recipient_email: "visitor@example.test",
      idempotency_key: "f07-disposable-schedule-email",
      selection_version: 1,
      delivery_status: "failed",
      failure_code: "provider_error",
      failure_message: "Safe failure message",
    },
  });
  if (emailRequest.failure_message !== "Safe failure message") {
    throw new Error("Generated ScheduleEmailRequest failure_message operation failed.");
  }

  console.log("Executed generated Prisma notification, moderation, reconciliation, and restored schedule-email field operations.");
} finally {
  await prisma.$disconnect();
}
