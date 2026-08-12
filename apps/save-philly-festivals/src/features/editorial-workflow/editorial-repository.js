import { randomUUID } from "node:crypto";

import { prisma } from "@/lib/db";
import { buildDateOverlapFilter, getDiscoveryDateRange } from "@/features/festivals/discovery";
import { buildFestivalRevisionSnapshot, FESTIVAL_REVISION_SNAPSHOT_SELECT } from "./festival-revision-snapshot";

export class EditorialNotFoundError extends Error {
  constructor(message = "Festival not found.") { super(message); this.statusCode = 404; this.code = "not_found"; }
}
export class EditorialConflictError extends Error {
  constructor() { super("Festival state or revision changed. Reload and try again."); this.statusCode = 409; this.code = "revision_conflict"; }
}

export const ASSET_REVIEWABLE_STATES = Object.freeze(["pending_review", "changes_requested", "approved", "published", "unpublished"]);
export function isAssetReviewPermitted(festival, expectedRevision) {
  return festival?.revision === expectedRevision && ASSET_REVIEWABLE_STATES.includes(festival.workflow_state);
}

const adminFestivalSelect = {
  ...FESTIVAL_REVISION_SNAPSHOT_SELECT,
  owner_user_id: true,
  /* Curation flags, deliberately outside FESTIVAL_REVISION_SNAPSHOT_FIELDS: the audit trigger
   * compares the snapshot against that fixed list, and promotion is editorial metadata rather
   * than festival content. Map coordinates are here for the same reason — derived data, not
   * content — and the detail page needs them to warn before publishing an unmappable festival. */
  featured: true,
  featured_rank: true,
  latitude: true,
  longitude: true,
  geocode_status: true,
  geocode_failure_reason: true,
  created_at: true,
  updated_at: true,
};

const detailSelect = {
  ...adminFestivalSelect,
  workflow_transitions: {
    select: { id: true, actor_user_id: true, from_state: true, to_state: true, revision: true, reason: true, producer_message: true, public_message: true, created_at: true },
    orderBy: [{ revision: "desc" }],
  },
  revisions: { select: { id: true, workflow_revision: true, actor_user_id: true, created_at: true }, orderBy: { workflow_revision: "desc" } },
  workflow_notifications: { select: { id: true, workflow_revision: true, audience: true, delivery_status: true, attempts: true, failure_code: true, attempt_started_at: true, attempted_at: true, sent_at: true, created_at: true }, orderBy: { created_at: "desc" } },
  private_assets: { select: { id: true, purpose: true, original_filename: true, mime_type: true, byte_size: true, alt_text: true, rights_version: true, rights_acknowledged_at: true, scan_status: true, lifecycle_status: true, editorial_status: true, reviewed_by_user_id: true, reviewed_at: true, editorial_reason: true, created_at: true }, orderBy: { created_at: "desc" } },
  occurrences: { select: { id: true, source_key: true, is_primary: true, calendar_date_type: true, time_zone: true, start_at: true, end_at: true, all_day_start: true, all_day_end: true, calendar_status: true, calendar_sequence: true, calendar_published_at: true }, orderBy: [{ is_primary: "desc" }, { created_at: "asc" }] },
};



function transitionPatch(current, toState, input, now) {
  const data = {
    workflow_state: toState,
    revision: current.revision + 1,
    public_message: null,
    published_at: null,
    canceled_at: null,
  };
  if (toState === "published") {
    data.first_published_at = current.first_published_at || now;
    data.published_at = now;
    data.calendar_published_at = current.calendar_published_at || now;
    data.calendar_status = "confirmed";
    data.calendar_sequence = { increment: 1 };
  } else if (toState === "canceled") {
    data.canceled_at = now;
    data.public_message = input.publicMessage;
    data.calendar_status = "canceled";
    data.calendar_sequence = { increment: 1 };
  } else if (current.workflow_state === "published" || current.workflow_state === "unpublished") {
    data.calendar_sequence = { increment: 1 };
  }
  return data;
}

export const editorialRepository = {
  findCurrentUser(id) {
    return prisma.user.findUnique({ where: { id }, select: { id: true, email: true, role: true } });
  },

  async list({ state, q, start, end, featured, page, limit }) {
    const and = [];
    if (state) and.push({ workflow_state: state });
    if (q) {
      and.push({
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { location: { contains: q, mode: "insensitive" } },
          { city: { contains: q, mode: "insensitive" } },
        ],
      });
    }
    if (featured) and.push({ featured: featured === "1" });
    /* Reuses the public date-overlap builder so the admin list and the public site agree on
     * what "happening in this range" means, including all-day festivals. */
    if (start || end) {
      const dateFilter = buildDateOverlapFilter(getDiscoveryDateRange({ date: "custom", start: start || "", end: end || "" }));
      if (dateFilter) and.push(dateFilter);
    }
    const where = and.length ? { AND: and } : {};

    const [festivals, total] = await Promise.all([
      prisma.festival.findMany({ where, select: adminFestivalSelect, orderBy: [{ updated_at: "desc" }, { id: "asc" }], skip: (page - 1) * limit, take: limit }),
      prisma.festival.count({ where }),
    ]);
    return { festivals, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  },

  /**
   * Editor content edit. Unlike the producer path this is not restricted by owner or workflow
   * state — correcting a published, ownerless imported festival is the primary use case.
   * Writes the same transition + revision audit pair a producer edit does, so the history stays
   * continuous regardless of who made the change.
   */
  updateEditable({ festivalId, expectedRevision, data, reason, datesChanged = false, actorUserId, createId = randomUUID }) {
    return prisma.$transaction(async (transaction) => {
      const current = await transaction.festival.findUnique({
        where: { id: festivalId },
        select: { workflow_state: true, revision: true, owner_user_id: true, calendar_date_type: true, time_zone: true, start_date: true, end_date: true, all_day_start: true, all_day_end: true },
      });
      if (!current) throw new EditorialNotFoundError();
      if (current.revision !== expectedRevision) throw new EditorialConflictError();

      const updated = await transaction.festival.updateMany({
        where: { id: festivalId, revision: expectedRevision },
        data: { ...data, revision: { increment: 1 } },
      });
      if (updated.count !== 1) throw new EditorialConflictError();

      const festival = await transaction.festival.findUnique({ where: { id: festivalId }, select: adminFestivalSelect });
      /* The reason is not decoration: `validate_festival_audit_at_commit` permits a same-state
       * editor edit only when this field is non-blank, which is what keeps an edit attributable
       * rather than silent. */
      const transition = await transaction.festivalTransition.create({
        data: {
          id: createId(),
          festival_id: festivalId,
          actor_user_id: actorUserId,
          from_state: current.workflow_state,
          to_state: current.workflow_state,
          revision: festival.revision,
          reason,
        },
      });
      await transaction.festivalRevision.create({
        data: {
          id: createId(),
          festival_id: festivalId,
          workflow_revision: festival.revision,
          transition_id: transition.id,
          actor_user_id: actorUserId,
          snapshot: buildFestivalRevisionSnapshot(festival),
        },
      });
      /* Producer-owned festivals require exactly one workflow notification per revision, so an
       * edit to someone else's listing is recorded for them the same way a transition is.
       * Delivery is separately gated; this is the outbox row, not a send. */
      if (current.owner_user_id) {
        await transaction.festivalWorkflowNotification.create({
          data: { id: createId(), festival_id: festivalId, workflow_revision: festival.revision, recipient_email: festival.contact_email },
        });
      }

      /* Keep the primary occurrence in step with the festival's dates. Skipping this desyncs
       * ICS export, which reads occurrences rather than the festival row.
       *
       * The existing primary is looked up by festival rather than by a fixed source key —
       * imported festivals carry `festival-import:<batch>:<row>` keys, not "legacy-primary",
       * and upserting on the assumed key creates a second primary and trips the
       * one-primary-per-festival constraint. */
      if (datesChanged) {
        const occurrenceData = festival.calendar_date_type === "timed"
          ? { calendar_date_type: "timed", time_zone: festival.time_zone, start_at: festival.start_date, end_at: festival.end_date, all_day_start: null, all_day_end: null }
          : { calendar_date_type: "all_day", time_zone: festival.time_zone, start_at: null, end_at: null, all_day_start: festival.all_day_start, all_day_end: festival.all_day_end };
        const existingPrimary = await transaction.festivalOccurrence.findFirst({
          where: { festival_id: festivalId, is_primary: true },
          select: { id: true },
        });
        if (existingPrimary) {
          await transaction.festivalOccurrence.update({
            where: { id: existingPrimary.id },
            data: {
              ...occurrenceData,
              /* Subscribed calendars only pick up a change when the sequence advances. */
              ...(festival.workflow_state === "published" ? { calendar_sequence: { increment: 1 } } : {}),
            },
          });
        } else {
          await transaction.festivalOccurrence.create({
            data: { id: createId(), festival_id: festivalId, source_key: `editorial-edit:${festivalId}`, is_primary: true, ...occurrenceData },
          });
        }
      }

      return festival;
    });
  },

  findDetail(id) {
    return prisma.festival.findUnique({ where: { id }, select: detailSelect });
  },

  findForTransition(id) {
    return prisma.festival.findUnique({ where: { id }, select: adminFestivalSelect });
  },

  transition({ festivalId, expectedRevision, fromState, toState, reason, producerMessage, publicMessage, actorUserId, now, createId = randomUUID }) {
    return prisma.$transaction(async (transaction) => {
      if (["published", "canceled"].includes(toState)) {
        const primaryCount = await transaction.festivalOccurrence.count({ where: { festival_id: festivalId, is_primary: true } });
        if (primaryCount !== 1) throw new EditorialConflictError();
      }
      const changed = await transaction.festival.updateMany({
        where: { id: festivalId, workflow_state: fromState, revision: expectedRevision },
        data: transitionPatch({ workflow_state: fromState, revision: expectedRevision, ...(await transaction.festival.findUnique({ where: { id: festivalId }, select: { first_published_at: true, calendar_published_at: true } })) }, toState, { publicMessage }, now),
      });
      if (changed.count !== 1) throw new EditorialConflictError();
      const festival = await transaction.festival.findUnique({ where: { id: festivalId }, select: adminFestivalSelect });
      const transitionId = createId();
      await transaction.festivalTransition.create({
        data: { id: transitionId, festival_id: festivalId, actor_user_id: actorUserId, from_state: fromState, to_state: toState, revision: festival.revision, reason: reason || null, producer_message: producerMessage || null, public_message: publicMessage || null },
      });
      await transaction.festivalRevision.create({
        data: { id: createId(), festival_id: festivalId, workflow_revision: festival.revision, transition_id: transitionId, actor_user_id: actorUserId, snapshot: buildFestivalRevisionSnapshot(festival) },
      });
      await transaction.festivalWorkflowNotification.create({
        data: { id: createId(), festival_id: festivalId, workflow_revision: festival.revision, recipient_email: festival.contact_email },
      });
      if (["published", "canceled"].includes(toState)) {
        const occurrenceUpdate = await transaction.festivalOccurrence.updateMany({
          where: { festival_id: festivalId, is_primary: true },
          data: {
            calendar_status: toState === "canceled" ? "canceled" : "confirmed",
            calendar_published_at: festival.calendar_published_at,
            calendar_sequence: { increment: 1 },
          },
        });
        if (occurrenceUpdate.count !== 1) throw new EditorialConflictError();
      }
      return festival;
    });
  },

  reviewAsset({ festivalId, assetId, expectedFestivalRevision, decision, reason, actorUserId, now }) {
    return prisma.$transaction(async (transaction) => {
      // Serialize against workflow transitions; both paths lock/update the Festival row.
      const rows = await transaction.$queryRawUnsafe(
        'SELECT "id", "revision", "workflow_state"::text AS "workflow_state" FROM "Festival" WHERE "id" = $1 FOR UPDATE',
        festivalId,
      );
      const festival = rows[0];
      if (!festival) throw new EditorialNotFoundError();
      if (!isAssetReviewPermitted(festival, expectedFestivalRevision)) throw new EditorialConflictError();
      const changed = await transaction.festivalAsset.updateMany({
        where: { id: assetId, festival_id: festivalId, editorial_status: "pending" },
        data: { editorial_status: decision, reviewed_by_user_id: actorUserId, reviewed_at: now, editorial_reason: reason || null },
      });
      if (changed.count !== 1) throw new EditorialConflictError();
      return transaction.festivalAsset.findUnique({ where: { id: assetId }, select: { id: true, festival_id: true, purpose: true, alt_text: true, scan_status: true, lifecycle_status: true, editorial_status: true, reviewed_at: true } });
    });
  },

  claimNotification({ notificationId, festivalId, workflowRevision, attemptToken, attemptedAt, staleBefore, maxAttempts }) {
    return prisma.$transaction(async (transaction) => {
      const identity = { ...(notificationId ? { id: notificationId } : {}), festival_id: festivalId, workflow_revision: workflowRevision, audience: "producer" };
      await transaction.festivalWorkflowNotification.updateMany({
        where: { ...identity, delivery_status: "pending", attempts: { gte: maxAttempts }, attempt_started_at: { lt: staleBefore } },
        data: { delivery_status: "failed", failure_code: "retry_exhausted", attempt_token: null, attempt_started_at: null },
      });
      const claimed = await transaction.festivalWorkflowNotification.updateMany({
        where: { ...identity, delivery_status: { in: ["pending", "failed"] }, attempts: { lt: maxAttempts }, OR: [{ attempt_token: null }, { attempt_started_at: { lt: staleBefore } }] },
        data: { delivery_status: "pending", attempt_token: attemptToken, attempt_started_at: attemptedAt, attempted_at: attemptedAt, attempts: { increment: 1 }, failure_code: null },
      });
      return claimed.count === 1 ? transaction.festivalWorkflowNotification.findUnique({ where: { attempt_token: attemptToken } }) : null;
    });
  },
  findNotificationStatus(id) {
    if (!id) return null;
    return prisma.festivalWorkflowNotification.findUnique({ where: { id }, select: { delivery_status: true, attempts: true } });
  },
  async findNotificationForRetry({ festivalId, notificationId }) {
    const notification = await prisma.festivalWorkflowNotification.findFirst({
      where: { id: notificationId, festival_id: festivalId, audience: "producer" },
      select: { id: true, workflow_revision: true, recipient_email: true, failure_code: true },
    });
    if (!notification) return null;
    const [transition, revision] = await Promise.all([
      prisma.festivalTransition.findUnique({
        where: { festival_id_revision: { festival_id: festivalId, revision: notification.workflow_revision } },
        select: { to_state: true, producer_message: true },
      }),
      prisma.festivalRevision.findUnique({
        where: { festival_id_workflow_revision: { festival_id: festivalId, workflow_revision: notification.workflow_revision } },
        select: { snapshot: true },
      }),
    ]);
    return transition && revision ? {
      festival: revision.snapshot,
      transition,
      recipientEmail: notification.recipient_email,
      failureCode: notification.failure_code,
    } : null;
  },
  markNotificationSent({ id, attemptToken, providerMessageId, sentAt }) {
    return prisma.festivalWorkflowNotification.updateMany({ where: { id, attempt_token: attemptToken, delivery_status: "pending" }, data: { delivery_status: "sent", provider_message_id: providerMessageId, sent_at: sentAt, attempt_token: null, attempt_started_at: null } });
  },
  markNotificationFailed({ id, attemptToken, failureCode }) {
    return prisma.festivalWorkflowNotification.updateMany({ where: { id, attempt_token: attemptToken, delivery_status: "pending" }, data: { delivery_status: "failed", failure_code: failureCode, attempt_token: null, attempt_started_at: null } });
  },
};

export { adminFestivalSelect };
