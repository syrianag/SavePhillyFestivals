import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.ts";
import { buildFestivalRevisionSnapshot } from "../src/features/editorial-workflow/festival-revision-snapshot.js";
import { createSocialFeedRepository } from "../src/features/social-feed/social-feed-repository-core.js";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const actorId = "00000000-0000-4000-8000-000000000001";
const pendingFestivalId = "00000000-0000-4000-8000-000000000110";
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
        revision: 0,
      },
      data: {
        workflow_state: "approved",
        revision: { increment: 1 },
      },
    });
    if (moderation.count !== 1) throw new Error("Generated conditional moderation operation did not update one row.");
    const transition = await transaction.festivalTransition.create({
      data: {
        festival_id: pendingFestivalId,
        actor_user_id: actorId,
        from_state: "pending_review",
        to_state: "approved",
        revision: 1,
      },
    });
    const festival = await transaction.festival.findUnique({ where: { id: pendingFestivalId } });
    await transaction.festivalRevision.create({
      data: {
        festival_id: pendingFestivalId,
        workflow_revision: 1,
        transition_id: transition.id,
        actor_user_id: actorId,
        snapshot: buildFestivalRevisionSnapshot(festival),
      },
    });
    await transaction.festivalWorkflowNotification.create({
      data: { festival_id: pendingFestivalId, workflow_revision: 1, recipient_email: null },
    });
    await transaction.festivalOccurrence.create({
      data: {
        festival_id: pendingFestivalId,
        source_key: "generated-evidence-primary",
        is_primary: true,
        calendar_date_type: "timed",
        time_zone: "America/New_York",
        start_at: new Date("2026-10-01T14:00:00.000Z"),
        end_at: new Date("2026-10-01T20:00:00.000Z"),
      },
    });
  });

  const workflowNotification = await prisma.festivalWorkflowNotification.findUniqueOrThrow({
    where: { festival_id_workflow_revision_audience: { festival_id: pendingFestivalId, workflow_revision: 1, audience: "producer" } },
  });
  const firstWorkflowClaim = await prisma.festivalWorkflowNotification.updateMany({
    where: { id: workflowNotification.id, delivery_status: "pending", attempts: { lt: 5 }, attempt_token: null },
    data: { attempt_token: "f08-generated-workflow-token-1", attempt_started_at: now, attempted_at: now, attempts: { increment: 1 } },
  });
  if (firstWorkflowClaim.count !== 1) throw new Error("Generated workflow notification claim failed.");
  await prisma.festivalWorkflowNotification.updateMany({
    where: { id: workflowNotification.id, attempt_token: "f08-generated-workflow-token-1" },
    data: { delivery_status: "failed", failure_code: "provider_error", attempt_token: null, attempt_started_at: null },
  });
  await prisma.festivalWorkflowNotification.update({
    where: { id: workflowNotification.id },
    data: { delivery_status: "pending", failure_code: null, attempt_token: "f08-generated-expired-token", attempt_started_at: new Date("2026-08-04T11:00:00.000Z") },
  });
  const expiredLeaseClaim = await prisma.festivalWorkflowNotification.updateMany({
    where: { id: workflowNotification.id, attempts: { lt: 5 }, attempt_started_at: { lt: new Date("2026-08-04T11:55:00.000Z") } },
    data: { attempt_token: "f08-generated-workflow-token-2", attempt_started_at: now, attempted_at: now, attempts: { increment: 1 } },
  });
  if (expiredLeaseClaim.count !== 1) throw new Error("Generated expired workflow lease recovery failed.");
  await prisma.festivalWorkflowNotification.updateMany({
    where: { id: workflowNotification.id, attempt_token: "f08-generated-workflow-token-2" },
    data: { delivery_status: "sent", provider_message_id: "provider-message-1", sent_at: now, attempt_token: null, attempt_started_at: null },
  });
  const duplicateWorkflowRetry = await prisma.festivalWorkflowNotification.updateMany({
    where: { id: workflowNotification.id, delivery_status: { in: ["pending", "failed"] }, attempts: { lt: 5 } },
    data: { attempt_token: "f08-generated-duplicate-token" },
  });
  if (duplicateWorkflowRetry.count !== 0) throw new Error("Generated duplicate workflow retry was not idempotent.");

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

  const socialRepository = createSocialFeedRepository(prisma);
  const publishedFestivalId = "00000000-0000-4000-8000-000000000106";
  const feed = await socialRepository.configureFeed({
    festivalId: publishedFestivalId, expectedRevision: 0, hashtag: "GeneratedEvidenceFest",
    enabled: true, provider: "curator", providerFeedId: "generated-evidence-feed",
  });
  const claimedFeed = await socialRepository.claimSyncFeed({
    feedId: feed.id, attemptToken: "f09-generated-sync-attempt", attemptedAt: now,
    staleBefore: new Date("2026-08-04T11:55:00.000Z"),
  });
  await socialRepository.ingestItems({
    feedId: feed.id, expectedRevision: feed.revision, sourceRevision: feed.source_revision,
    expectedCursor: null, attemptToken: claimedFeed.sync_attempt_token, nextCursor: "generated-next", attemptedAt: now,
    items: [
      { providerItemId: "generated-approved", network: "instagram", canonicalUrl: "https://www.instagram.com/p/generated-approved/", authorName: "Approved Author", authorHandle: "approved", textExcerpt: "Generated approved public post.", sourcePublishedAt: now },
      { providerItemId: "generated-hidden", network: "facebook", canonicalUrl: "https://www.facebook.com/generated-hidden/", authorName: "Hidden Author", authorHandle: null, textExcerpt: "Generated hidden post.", sourcePublishedAt: now },
    ],
  });
  const pendingSocial = await socialRepository.listPosts(publishedFestivalId, { status: "pending", page: 1, limit: 24 });
  const approvedCandidate = pendingSocial.posts.find((post) => post.provider_item_id === "generated-approved");
  const hiddenCandidate = pendingSocial.posts.find((post) => post.provider_item_id === "generated-hidden");
  await socialRepository.moderatePost({ festivalId: publishedFestivalId, postId: approvedCandidate.id, expectedRevision: 0, status: "approved", actorUserId: actorId, now });
  await socialRepository.moderatePost({ festivalId: publishedFestivalId, postId: hiddenCandidate.id, expectedRevision: 0, status: "hidden", reason: "Generated hidden evidence", actorUserId: actorId, now });
  const publicSocial = await socialRepository.getPublicFeed(publishedFestivalId);
  if (publicSocial.posts.length !== 1 || publicSocial.posts[0].text !== "Generated approved public post." || JSON.stringify(publicSocial).includes("Generated hidden post.")) {
    throw new Error("Generated Prisma approved-only social repository evidence failed.");
  }
  const changedFeed = await socialRepository.configureFeed({
    festivalId: publishedFestivalId, expectedRevision: feed.revision, hashtag: "ChangedEvidenceFest",
    enabled: true, provider: "flockler", providerFeedId: "changed-evidence-feed",
  });
  const changedSourcePublic = await socialRepository.getPublicFeed(publishedFestivalId);
  if (changedSourcePublic.posts.length !== 0 || changedSourcePublic.hashtag !== "#ChangedEvidenceFest") {
    throw new Error("Generated Prisma source-generation isolation evidence failed.");
  }
  const firstNullCursorClaim = await socialRepository.claimSyncFeed({
    feedId: changedFeed.id, attemptToken: "f09-null-cursor-attempt-a", attemptedAt: now,
    staleBefore: new Date("2026-08-04T11:55:00.000Z"),
  });
  let overlappingClaimRejected = false;
  try {
    await socialRepository.claimSyncFeed({ feedId: changedFeed.id, attemptToken: "f09-null-cursor-attempt-b", attemptedAt: now, staleBefore: new Date("2026-08-04T11:55:00.000Z") });
  } catch (error) {
    overlappingClaimRejected = error?.code === "revision_conflict";
  }
  if (!overlappingClaimRejected) throw new Error("Generated overlapping null-cursor sync claim was not rejected.");
  await socialRepository.recordSyncFailure({
    feedId: changedFeed.id, expectedRevision: changedFeed.revision, sourceRevision: changedFeed.source_revision,
    expectedCursor: null, attemptToken: firstNullCursorClaim.sync_attempt_token, attemptedAt: now, errorCode: "provider_error",
  });
  const secondNullCursorClaim = await socialRepository.claimSyncFeed({
    feedId: changedFeed.id, attemptToken: "f09-null-cursor-attempt-b", attemptedAt: new Date("2026-08-04T12:01:00.000Z"),
    staleBefore: new Date("2026-08-04T11:56:00.000Z"),
  });
  const obsoleteFailure = await socialRepository.recordSyncFailure({
    feedId: changedFeed.id, expectedRevision: changedFeed.revision, sourceRevision: changedFeed.source_revision,
    expectedCursor: null, attemptToken: firstNullCursorClaim.sync_attempt_token, attemptedAt: new Date("2026-08-04T11:59:00.000Z"), errorCode: "provider_error",
  });
  if (obsoleteFailure.count !== 0) throw new Error("Obsolete sync failure overwrote a newer null-cursor claim.");
  await socialRepository.ingestItems({
    feedId: changedFeed.id, expectedRevision: changedFeed.revision, sourceRevision: changedFeed.source_revision,
    expectedCursor: null, attemptToken: secondNullCursorClaim.sync_attempt_token, items: [], nextCursor: null,
    attemptedAt: new Date("2026-08-04T12:01:00.000Z"),
  });
  const failureAfterSuccess = await socialRepository.recordSyncFailure({
    feedId: changedFeed.id, expectedRevision: changedFeed.revision, sourceRevision: changedFeed.source_revision,
    expectedCursor: null, attemptToken: firstNullCursorClaim.sync_attempt_token, attemptedAt: new Date("2026-08-04T11:59:00.000Z"), errorCode: "provider_error",
  });
  if (failureAfterSuccess.count !== 0) throw new Error("Older failure overwrote a newer successful null-cursor sync.");

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

  console.log("Executed generated Prisma notification claims, editorial transition/snapshot/outbox/occurrence, expired workflow lease recovery, failed/sent retry state, duplicate retry suppression, reconciliation, approved-only/source-isolated social repository operations, and restored schedule-email field operations.");
} finally {
  await prisma.$disconnect();
}
