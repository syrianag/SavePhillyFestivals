const organizer = {
  id: "d80e4eb4-2291-4ce5-98bb-3e26e510ec36",
  name: "Riverfront Arts Festival organizers",
  festival_id: "e2e-approved-1",
  festival_name: "Riverfront Arts Festival",
};
const secondOrganizer = {
  id: "7de186c4-38a2-4e66-bde5-e536ec0c6531",
  name: "Riverfront Community Partners",
  festival_id: "e2e-approved-1",
  festival_name: "Riverfront Arts Festival",
};
const consents = new Map();

export function getOrganizerConsentE2eRepository() {
  if (process.env.DISCOVERY_E2E_FIXTURE !== "1") return null;
  return {
    resolveEligible: async () => ({ festivalIds: [organizer.festival_id], organizers: [organizer, secondOrganizer] }),
    findConsentBySubmissionKey: async (key) => consents.get(key) || null,
    findSuppressedOrganizerIds: async () => [],
    createConsent: async (data) => {
      const consent = { ...data, request_fingerprint: data.requestFingerprint, organizers: data.organizers.map((entry) => ({ organizer_integration_id: entry.id })), preferences: data.preferences.map((preference) => ({ preference })) };
      consents.set(data.submissionKey, consent);
      return consent;
    },
    revokeConsent: async () => true,
  };
}
