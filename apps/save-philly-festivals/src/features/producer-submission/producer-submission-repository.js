import { randomUUID } from "node:crypto";

import { prisma } from "@/lib/db";
import { buildFestivalRevisionSnapshot, FESTIVAL_REVISION_SNAPSHOT_SELECT } from "@/features/editorial-workflow/festival-revision-snapshot";
import { ProducerFestivalConflictError, ProducerFestivalNotFoundError } from "./producer-submission-errors";

const editableStates = ["draft", "changes_requested"];
// Allow uploads while a submission is pending review so producers can attach images
// that editors will see. Editing festival fields remains restricted to editableStates.
const uploadableStates = ["draft", "changes_requested", "pending_review"];
const festivalSelect = {
  ...FESTIVAL_REVISION_SNAPSHOT_SELECT,
  status: true,
  created_at: true,
  updated_at: true,
  workflow_transitions: {
    select: { from_state: true, to_state: true, revision: true, producer_message: true, created_at: true },
    orderBy: { revision: "asc" },
  },
};

export const producerSubmissionRepository = {
  findCurrentUser(id) {
    return prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, email_verified: true, role: true },
    });
  },

  findOwnedBySubmissionKey(ownerUserId, submissionKey) {
    return prisma.festival.findUnique({
      where: { owner_user_id_submission_key: { owner_user_id: ownerUserId, submission_key: submissionKey } },
      select: festivalSelect,
    });
  },

  listOwned(ownerUserId) {
    return prisma.festival.findMany({
      where: { owner_user_id: ownerUserId },
      select: festivalSelect,
      orderBy: [{ updated_at: "desc" }, { id: "asc" }],
      take: 100,
    });
  },

  findOwned(ownerUserId, festivalId) {
    return prisma.festival.findFirst({
      where: { id: festivalId, owner_user_id: ownerUserId },
      select: festivalSelect,
    });
  },

  createOwnedDraft({ id, ownerUserId, submissionKey, slug }) {
    return prisma.$transaction(async (transaction) => {
      const festival = await transaction.festival.create({
        data: {
          id,
          owner_user_id: ownerUserId,
          submission_key: submissionKey,
          name: "",
          slug,
          workflow_state: "draft",
          revision: 0,
        },
        select: festivalSelect,
      });
      const transition = await transaction.festivalTransition.create({
        data: {
          festival_id: id,
          actor_user_id: ownerUserId,
          from_state: null,
          to_state: "draft",
          revision: 0,
        },
      });
      await transaction.festivalRevision.create({
        data: {
          festival_id: id,
          workflow_revision: 0,
          transition_id: transition.id,
          actor_user_id: ownerUserId,
          snapshot: buildFestivalRevisionSnapshot(festival),
        },
      });
      return festival;
    });
  },

  updateOwnedEditable({ ownerUserId, festivalId, expectedRevision, data }) {
    return prisma.$transaction(async (transaction) => {
      const current = await transaction.festival.findFirst({
        where: { id: festivalId, owner_user_id: ownerUserId },
        select: { workflow_state: true, revision: true },
      });
      if (!current) throw new ProducerFestivalNotFoundError();
      if (!editableStates.includes(current.workflow_state) || current.revision !== expectedRevision) {
        throw new ProducerFestivalConflictError();
      }

      const updated = await transaction.festival.updateMany({
        where: {
          id: festivalId,
          owner_user_id: ownerUserId,
          workflow_state: { in: editableStates },
          revision: expectedRevision,
        },
        data: { ...data, revision: { increment: 1 } },
      });
      if (updated.count !== 1) throw new ProducerFestivalConflictError();
      const festival = await transaction.festival.findFirst({
        where: { id: festivalId, owner_user_id: ownerUserId },
        select: festivalSelect,
      });
      const transition = await transaction.festivalTransition.create({
        data: {
          festival_id: festivalId,
          actor_user_id: ownerUserId,
          from_state: current.workflow_state,
          to_state: current.workflow_state,
          revision: festival.revision,
        },
      });
      await transaction.festivalRevision.create({
        data: {
          festival_id: festivalId,
          workflow_revision: festival.revision,
          transition_id: transition.id,
          actor_user_id: ownerUserId,
          snapshot: buildFestivalRevisionSnapshot(festival),
        },
      });
      return festival;
    });
  },

  submitOwned({ ownerUserId, festivalId, expectedRevision, teamRecipientAlias, acknowledgments, assertComplete }) {
    return prisma.$transaction(async (transaction) => {
      const current = await transaction.festival.findFirst({
        where: { id: festivalId, owner_user_id: ownerUserId },
        select: festivalSelect,
      });
      if (!current) throw new ProducerFestivalNotFoundError();

      if (current.workflow_state === "pending_review") {
        if (current.revision !== expectedRevision + 1) throw new ProducerFestivalConflictError();
        const [notificationCount, transitionCount] = await Promise.all([
          transaction.producerSubmissionNotification.count({
            where: { festival_id: festivalId, workflow_revision: current.revision },
          }),
          transaction.festivalTransition.count({
            where: {
              festival_id: festivalId,
              revision: current.revision,
              from_state: { in: editableStates },
              to_state: "pending_review",
            },
          }),
        ]);
        if (notificationCount === 2 && transitionCount === 1) return { festival: current, replayed: true };
        throw new ProducerFestivalConflictError();
      }
      if (!editableStates.includes(current.workflow_state) || current.revision !== expectedRevision) {
        throw new ProducerFestivalConflictError();
      }
      assertComplete(current);

      const nextRevision = expectedRevision + 1;
      const changed = await transaction.festival.updateMany({
        where: {
          id: festivalId,
          owner_user_id: ownerUserId,
          workflow_state: current.workflow_state,
          revision: expectedRevision,
        },
        data: {
          workflow_state: "pending_review",
          rejection_reason: null,
          revision: nextRevision,
          representation_acknowledged_at: acknowledgments.at,
          accuracy_acknowledged_at: acknowledgments.at,
          terms_acknowledged_at: acknowledgments.at,
          terms_version: acknowledgments.termsVersion,
        },
      });
      if (changed.count !== 1) throw new ProducerFestivalConflictError();

      const transition = await transaction.festivalTransition.create({
        data: {
          festival_id: festivalId,
          actor_user_id: ownerUserId,
          from_state: current.workflow_state,
          to_state: "pending_review",
          revision: nextRevision,
        },
      });
      const transitionedFestival = await transaction.festival.findFirst({
        where: { id: festivalId, owner_user_id: ownerUserId },
        select: festivalSelect,
      });
      await transaction.festivalRevision.create({
        data: {
          festival_id: festivalId,
          workflow_revision: nextRevision,
          transition_id: transition.id,
          actor_user_id: ownerUserId,
          snapshot: buildFestivalRevisionSnapshot(transitionedFestival),
        },
      });
      const occurrenceData = current.calendar_date_type === "timed"
        ? { calendar_date_type: "timed", time_zone: current.time_zone, start_at: current.start_date, end_at: current.end_date, all_day_start: null, all_day_end: null }
        : { calendar_date_type: "all_day", time_zone: current.time_zone, start_at: null, end_at: null, all_day_start: current.all_day_start, all_day_end: current.all_day_end };
      const primaryOccurrence = await transaction.festivalOccurrence.upsert({
        where: { festival_id_source_key: { festival_id: festivalId, source_key: "legacy-primary" } },
        create: { id: randomUUID(), festival_id: festivalId, source_key: "legacy-primary", is_primary: true, ...occurrenceData },
        update: { is_primary: true, ...occurrenceData },
        select: { id: true, festival_id: true, is_primary: true },
      });
      if (primaryOccurrence.festival_id !== festivalId || !primaryOccurrence.is_primary) {
        throw new ProducerFestivalConflictError();
      }
      await transaction.producerSubmissionNotification.createMany({
        data: [
          {
            festival_id: festivalId,
            workflow_revision: nextRevision,
            notification_type: "producer_receipt",
            recipient_email: current.contact_email,
          },
          {
            festival_id: festivalId,
            workflow_revision: nextRevision,
            notification_type: "team_notification",
            recipient_alias: teamRecipientAlias,
          },
        ],
      });
      return { festival: transitionedFestival, replayed: false };
    });
  },

  async claimSubmissionNotification({ festivalId, workflowRevision, notificationType, attemptToken, attemptedAt, staleBefore }) {
    const claimed = await prisma.producerSubmissionNotification.updateMany({
      where: {
        festival_id: festivalId,
        workflow_revision: workflowRevision,
        notification_type: notificationType,
        delivery_status: { in: ["pending", "failed"] },
        OR: [
          { attempt_token: null },
          { attempt_started_at: { lt: staleBefore } },
        ],
      },
      data: {
        delivery_status: "pending",
        attempt_token: attemptToken,
        attempt_started_at: attemptedAt,
        attempted_at: attemptedAt,
        attempts: { increment: 1 },
        failure_code: null,
      },
    });
    if (claimed.count !== 1) return null;
    return prisma.producerSubmissionNotification.findUnique({ where: { attempt_token: attemptToken } });
  },

  markSubmissionNotificationSent({ notificationId, attemptToken, providerMessageId, sentAt }) {
    return prisma.producerSubmissionNotification.updateMany({
      where: { id: notificationId, attempt_token: attemptToken, delivery_status: "pending" },
      data: {
        delivery_status: "sent",
        provider_message_id: providerMessageId,
        failure_code: null,
        sent_at: sentAt,
        attempt_token: null,
        attempt_started_at: null,
      },
    });
  },

  markSubmissionNotificationFailed({ notificationId, attemptToken, failureCode }) {
    return prisma.producerSubmissionNotification.updateMany({
      where: { id: notificationId, attempt_token: attemptToken, delivery_status: "pending" },
      data: {
        delivery_status: "failed",
        failure_code: failureCode,
        attempt_token: null,
        attempt_started_at: null,
      },
    });
  },

  async assertOwnedEditable(ownerUserId, festivalId) {
    const festival = await prisma.festival.findFirst({
      where: { id: festivalId, owner_user_id: ownerUserId },
      select: { id: true, workflow_state: true },
    });
    if (!festival) throw new ProducerFestivalNotFoundError();
    if (!editableStates.includes(festival.workflow_state)) throw new ProducerFestivalConflictError();
    return festival;
  },

  recordFailedAssetCleanup({ marker, providerFileId, serverFilename, checksumSha256, attemptedAt }) {
    return prisma.festivalAssetReconciliation.create({
      data: {
        reconciliation_marker: marker,
        provider_file_id: providerFileId,
        server_filename: serverFilename,
        checksum_sha256: checksumSha256,
        cleanup_status: "failed",
        cleanup_attempts: 1,
        last_error_code: "provider_cleanup_failed",
        last_attempted_at: attemptedAt,
      },
    });
  },

  async claimAssetReconciliation({ marker, attemptedAt }) {
    const claimed = await prisma.festivalAssetReconciliation.updateMany({
      where: {
        reconciliation_marker: marker,
        cleanup_status: { in: ["pending", "failed"] },
      },
      data: {
        cleanup_status: "retrying",
        cleanup_attempts: { increment: 1 },
        last_attempted_at: attemptedAt,
        last_error_code: null,
      },
    });
    if (claimed.count !== 1) return null;
    return prisma.festivalAssetReconciliation.findUnique({
      where: { reconciliation_marker: marker },
    });
  },

  markAssetReconciliationCleaned({ id, cleanedAt }) {
    return prisma.festivalAssetReconciliation.updateMany({
      where: { id, cleanup_status: "retrying" },
      data: {
        cleanup_status: "cleaned",
        cleaned_at: cleanedAt,
        last_error_code: null,
      },
    });
  },

  markAssetReconciliationFailed({ id }) {
    return prisma.festivalAssetReconciliation.updateMany({
      where: { id, cleanup_status: "retrying" },
      data: {
        cleanup_status: "failed",
        last_error_code: "provider_cleanup_failed",
      },
    });
  },

  createPrivateAsset({ ownerUserId, festivalId, asset, providerResult, acknowledgedAt }) {
    return prisma.$transaction(async (transaction) => {
      const festival = await transaction.festival.findFirst({
        where: { id: festivalId, owner_user_id: ownerUserId },
        select: { workflow_state: true },
      });
      if (!festival) throw new ProducerFestivalNotFoundError();
      if (!uploadableStates.includes(festival.workflow_state)) throw new ProducerFestivalConflictError();

      return transaction.festivalAsset.create({
        data: {
          id: asset.id,
          festival_id: festivalId,
          uploader_user_id: ownerUserId,
          drive_file_id: providerResult.driveFileId,
          server_filename: asset.serverFilename,
          original_filename: asset.originalFilename,
          mime_type: asset.mimeType,
          byte_size: asset.byteSize,
          checksum_sha256: asset.checksumSha256,
          purpose: asset.purpose,
          alt_text: asset.altText,
          rights_version: asset.rightsVersion,
          rights_acknowledged_at: acknowledgedAt,
          provider_md5_checksum: providerResult.metadata.md5Checksum,
          provider_version: providerResult.metadata.version,
        },
      });
    });
  },
};
