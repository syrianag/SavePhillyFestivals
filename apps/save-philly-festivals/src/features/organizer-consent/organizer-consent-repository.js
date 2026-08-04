import { prisma } from "@/lib/db";
import { FESTIVAL_STATUS } from "@/lib/constants";
import { eligibleOrganizerResult, parentFestivalIds } from "@/features/organizer-consent/organizer-consent-resolution";

const consentInclude = {
  organizers: true,
  preferences: true,
  festivals: true,
};

export const organizerConsentRepository = {
  async resolveEligible(items) {
    const festivalIds = items.filter((item) => item.type === "festival").map((item) => item.id);
    const eventIds = items.filter((item) => item.type === "event").map((item) => item.id);
    const [festivals, events] = await Promise.all([
      prisma.festival.findMany({
        where: { id: { in: festivalIds }, status: FESTIVAL_STATUS.APPROVED },
        select: { id: true },
      }),
      prisma.schedule.findMany({
        where: { id: { in: eventIds }, festival: { status: FESTIVAL_STATUS.APPROVED } },
        select: { id: true, festival_id: true },
      }),
    ]);
    const approvedParentIds = parentFestivalIds(items, festivals, events);
    const integrations = await prisma.organizerIntegration.findMany({
      where: {
        festival_id: { in: approvedParentIds },
        enabled: true,
        authorization_status: "authorized",
      },
      select: {
        id: true,
        organizer_name: true,
        festival_id: true,
        enabled: true,
        authorization_status: true,
        festival: { select: { name: true } },
      },
    });
    return { festivalIds: approvedParentIds, organizers: eligibleOrganizerResult(approvedParentIds, integrations) };
  },

  async findSuppressedOrganizerIds(email, organizerIds) {
    const records = await prisma.organizerMailingSuppression.findMany({
      where: { normalized_email: email, organizer_integration_id: { in: organizerIds } },
      select: { organizer_integration_id: true },
    });
    return records.map(({ organizer_integration_id }) => organizer_integration_id);
  },

  findConsentBySubmissionKey(submissionKey) {
    return prisma.organizerMailingConsent.findUnique({
      where: { submission_key: submissionKey },
      include: consentInclude,
    });
  },

  createConsent(data) {
    return prisma.$transaction(async (transaction) => {
      const consent = await transaction.organizerMailingConsent.create({
        data: {
          id: data.id,
          submission_key: data.submissionKey,
          request_fingerprint: data.requestFingerprint,
          normalized_email: data.email,
          consent_text: data.consentText,
          consent_version: data.consentVersion,
          preference_version: data.preferenceVersion,
          source: data.source,
          request_ip: data.requestIp,
          management_token_hash: data.managementTokenHash,
          festivals: { create: data.festivalIds.map((festival_id) => ({ festival_id })) },
          organizers: { create: data.organizers.map(({ id }) => ({ organizer_integration_id: id })) },
          preferences: { create: data.preferences.map((preference) => ({ preference })) },
        },
        include: consentInclude,
      });
      await transaction.organizerMailingOutbox.createMany({
        data: data.organizers.map(({ id: organizerId }) => ({
          consent_id: data.id,
          organizer_integration_id: organizerId,
          idempotency_key: data.idempotencyKeys.get(organizerId),
          max_attempts: data.maxAttempts,
        })),
      });
      return consent;
    });
  },

  async revokeConsent(consentId, managementTokenHash) {
    return prisma.$transaction(async (transaction) => {
      const now = new Date();
      const consent = await transaction.organizerMailingConsent.findFirst({
        where: { id: consentId, management_token_hash: managementTokenHash, revoked_at: null },
        select: { normalized_email: true, organizers: { select: { organizer_integration_id: true } } },
      });
      if (!consent) return false;
      await transaction.organizerMailingConsent.update({ where: { id: consentId }, data: { revoked_at: now } });
      await transaction.organizerMailingSuppression.createMany({
        data: consent.organizers.map(({ organizer_integration_id }) => ({
          normalized_email: consent.normalized_email,
          organizer_integration_id,
          reason: "visitor_revoked",
        })),
        skipDuplicates: true,
      });
      await transaction.organizerMailingConsentOrganizer.updateMany({
        where: { consent_id: consentId }, data: { revoked_at: now },
      });
      await transaction.organizerMailingOutbox.updateMany({
        where: { consent_id: consentId, status: { in: ["pending", "processing"] } },
        data: { status: "suppressed", suppressed_at: now, lease_token_hash: null, lease_expires_at: null },
      });
      return true;
    });
  },
};
