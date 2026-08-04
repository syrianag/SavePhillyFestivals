import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { completedState, nextFailureState, OUTBOX_LEASE_MS } from "@/features/organizer-consent/organizer-outbox-state";
import { constantTimeSecretMatches, redactedOutboxError, sha256 } from "@/features/organizer-consent/organizer-consent-security";

const eligibilityWhere = {
  consent: { is: { revoked_at: null, suppressed_at: null } },
  organizer_integration: { is: { enabled: true, authorization_status: "authorized" } },
};

export const organizerOutboxRepository = {
  async claim(limit, now = new Date()) {
    return prisma.$transaction(async (transaction) => {
      await transaction.organizerMailingOutbox.updateMany({
        where: {
          status: { in: ["pending", "processing"] },
          OR: [
            { consent: { is: { OR: [{ revoked_at: { not: null } }, { suppressed_at: { not: null } }] } } },
            { organizer_integration: { is: { OR: [{ enabled: false }, { authorization_status: "revoked" }] } } },
          ],
        },
        data: { status: "suppressed", suppressed_at: now, lease_token_hash: null, lease_expires_at: null },
      });
      const candidates = await transaction.organizerMailingOutbox.findMany({
        where: {
          ...eligibilityWhere,
          attempts: { lt: 5 },
          OR: [
            { status: "pending", next_attempt_at: { lte: now } },
            { status: "processing", lease_expires_at: { lte: now } },
          ],
        },
        orderBy: [{ next_attempt_at: "asc" }, { created_at: "asc" }],
        take: limit,
        include: {
          consent: { select: { normalized_email: true, preference_version: true, preferences: { select: { preference: true } } } },
          organizer_integration: { select: { id: true, organizer_name: true, festival_id: true } },
        },
      });
      const claimed = [];
      for (const item of candidates) {
        const [grant, suppression] = await Promise.all([
          transaction.organizerMailingConsentOrganizer.findUnique({
            where: {
              consent_id_organizer_integration_id: {
                consent_id: item.consent_id,
                organizer_integration_id: item.organizer_integration_id,
              },
            },
            select: { revoked_at: true, suppressed_at: true },
          }),
          transaction.organizerMailingSuppression.findUnique({
            where: {
              normalized_email_organizer_integration_id: {
                normalized_email: item.consent.normalized_email,
                organizer_integration_id: item.organizer_integration_id,
              },
            },
            select: { id: true },
          }),
        ]);

        if (!grant || grant.revoked_at || grant.suppressed_at || suppression) {
          await transaction.organizerMailingOutbox.updateMany({
            where: { id: item.id, status: item.status, attempts: item.attempts },
            data: {
              status: "suppressed",
              suppressed_at: now,
              lease_token_hash: null,
              lease_expires_at: null,
            },
          });
          continue;
        }

        const leaseToken = randomBytes(32).toString("base64url");
        const leaseExpiresAt = new Date(now.getTime() + OUTBOX_LEASE_MS);
        const update = await transaction.organizerMailingOutbox.updateMany({
          where: { id: item.id, status: item.status, attempts: item.attempts, ...eligibilityWhere },
          data: { status: "processing", attempts: { increment: 1 }, lease_token_hash: sha256(leaseToken), lease_expires_at: leaseExpiresAt },
        });
        if (update.count === 1) claimed.push({
          outbox_id: item.id,
          lease_token: leaseToken,
          idempotency_key: item.idempotency_key,
          email: item.consent.normalized_email,
          organizer: item.organizer_integration,
          preferences: item.consent.preferences.map(({ preference }) => preference),
          preference_version: item.consent.preference_version,
          attempt: item.attempts + 1,
          max_attempts: item.max_attempts,
          lease_expires_at: leaseExpiresAt.toISOString(),
        });
      }
      return claimed;
    });
  },

  async report(input, now = new Date()) {
    return prisma.$transaction(async (transaction) => {
      const item = await transaction.organizerMailingOutbox.findUnique({
        where: { id: input.outbox_id },
        include: {
          consent: { select: { revoked_at: true, suppressed_at: true } },
          organizer_integration: { select: { enabled: true, authorization_status: true } },
        },
      });
      if (!item || item.status !== "processing" || !item.lease_token_hash || item.lease_expires_at <= now || !constantTimeSecretMatches(sha256(input.lease_token), item.lease_token_hash)) return { accepted: false, reason: "invalid_or_expired_lease" };
      const grant = await transaction.organizerMailingConsentOrganizer.findUnique({
        where: { consent_id_organizer_integration_id: { consent_id: item.consent_id, organizer_integration_id: item.organizer_integration_id } },
      });
      const eligible = !item.consent.revoked_at && !item.consent.suppressed_at && !grant?.revoked_at && !grant?.suppressed_at && item.organizer_integration.enabled && item.organizer_integration.authorization_status === "authorized";
      if (!eligible) {
        await transaction.organizerMailingOutbox.updateMany({ where: { id: item.id, status: "processing", lease_token_hash: item.lease_token_hash }, data: { status: "suppressed", suppressed_at: now, lease_token_hash: null, lease_expires_at: null } });
        return { accepted: false, reason: "suppressed" };
      }
      const state = input.outcome === "completed"
        ? completedState(item, input.provider_result_id, now)
        : nextFailureState(item, { retryable: input.retryable, errorCode: redactedOutboxError(input.error_code), now });
      const updated = await transaction.organizerMailingOutbox.updateMany({
        where: { id: item.id, status: "processing", lease_token_hash: item.lease_token_hash, lease_expires_at: { gt: now }, ...eligibilityWhere },
        data: { ...state, lease_token_hash: null, lease_expires_at: null },
      });
      if (updated.count !== 1) return { accepted: false, reason: "invalid_or_expired_lease" };
      return { accepted: true, status: state.status, attempts: item.attempts, max_attempts: item.max_attempts };
    });
  },
};
