import { randomBytes, randomUUID } from "node:crypto";
import { CONSENT_TEXT } from "@/features/organizer-consent/organizer-consent-schema";
import { OUTBOX_MAX_ATTEMPTS } from "@/features/organizer-consent/organizer-outbox-state";
import { sha256 } from "@/features/organizer-consent/organizer-consent-security";

export class ConsentConflictError extends Error {
  constructor() { super("This consent submission key was already used for different choices."); this.statusCode = 409; }
}
export class NoEligibleOrganizerError extends Error {
  constructor() { super("None of the selected festivals currently has an authorized organizer mailing integration."); this.statusCode = 422; }
}

export function consentRequestFingerprint(input) {
  return sha256(JSON.stringify({
    email: input.email,
    selection: input.selection,
    organizer_ids: [...input.organizer_ids].sort(),
    preferences: [...input.preferences].sort(),
    consent_acknowledged: input.consent_acknowledged,
    consent_version: input.consent_version,
    preference_version: input.preference_version,
    source: input.source,
  }));
}

function matches(existing, fingerprint) {
  return existing.request_fingerprint === fingerprint;
}

export async function listEligibleOrganizers(selection, repository) {
  const resolved = await repository.resolveEligible(selection.items);
  return { organizers: resolved.organizers, ineligible_selection_count: Math.max(0, selection.items.length - resolved.festivalIds.length) };
}

export async function submitOrganizerConsent(input, { repository, requestIp }) {
  const requestFingerprint = consentRequestFingerprint(input);
  const existing = await repository.findConsentBySubmissionKey(input.submission_key);
  if (existing) {
    if (!matches(existing, requestFingerprint)) throw new ConsentConflictError();
    return { consent_id: existing.id, queued_organizers: existing.organizers.length, replayed: true };
  }

  const eligible = await repository.resolveEligible(input.selection.items);
  const eligibleById = new Map(eligible.organizers.map((organizer) => [organizer.id, organizer]));
  const suppressedIds = new Set(await repository.findSuppressedOrganizerIds(input.email, input.organizer_ids));
  const organizers = input.organizer_ids.map((id) => eligibleById.get(id)).filter((organizer) => organizer && !suppressedIds.has(organizer.id));
  if (!organizers.length) throw new NoEligibleOrganizerError();

  const consentId = randomUUID();
  const managementToken = randomBytes(32).toString("base64url");
  const idempotencyKeys = new Map(organizers.map(({ id }) => [
    id,
    sha256(`${consentId}:${id}:${input.preference_version}`),
  ]));
  let consent;
  try {
    consent = await repository.createConsent({
      id: consentId,
      submissionKey: input.submission_key,
      requestFingerprint,
      email: input.email,
      consentText: CONSENT_TEXT,
      consentVersion: input.consent_version,
      preferenceVersion: input.preference_version,
      source: input.source,
      requestIp,
      managementTokenHash: sha256(managementToken),
      festivalIds: eligible.festivalIds,
      organizers,
      preferences: input.preferences,
      idempotencyKeys,
      maxAttempts: OUTBOX_MAX_ATTEMPTS,
    });
  } catch (error) {
    if (error?.code !== "P2002") throw error;
    const raced = await repository.findConsentBySubmissionKey(input.submission_key);
    if (!raced || !matches(raced, requestFingerprint)) throw new ConsentConflictError();
    return { consent_id: raced.id, queued_organizers: raced.organizers.length, replayed: true };
  }
  return {
    consent_id: consent.id || consentId,
    queued_organizers: organizers.length,
    ineligible_organizers: input.organizer_ids.length - organizers.length,
    replayed: false,
    management_token: managementToken,
  };
}

export async function revokeOrganizerConsent(input, repository) {
  return repository.revokeConsent(input.consent_id, sha256(input.management_token));
}
