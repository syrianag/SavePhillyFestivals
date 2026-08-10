import { prisma } from "@/lib/db";

const CANDIDATE_SELECT = {
  id: true,
  name: true,
  location: true,
  city: true,
  state: true,
  latitude: true,
  geocoded_location: true,
  geocode_attempts: true,
  workflow_state: true,
};

/* Published first: those are the only festivals currently visible on the public map, so a
 * missing pin there is the one that actually costs a visitor something. */
const SWEEP_PRIORITY = ["published", "approved", "pending_review"];

function priorityRank(workflowState) {
  const index = SWEEP_PRIORITY.indexOf(workflowState);
  return index === -1 ? SWEEP_PRIORITY.length : index;
}

/**
 * A festival is due when it has a location and either has never resolved, or its location text
 * has changed since it last did.
 *
 * Prisma cannot compare two columns in a `where`, so the changed-location test is applied in JS
 * over the candidate set. At a few hundred festivals that is free. Past a few thousand, move
 * this to `$queryRaw` with `geocoded_location IS DISTINCT FROM location`.
 */
function isDue(festival, maxAttempts) {
  if (festival.geocode_attempts >= maxAttempts) return false;
  if (festival.latitude === null) return true;
  return festival.geocoded_location !== festival.location;
}

export const geocodingRepository = {
  async findGeocodeCandidates({ limit, maxAttempts }) {
    const rows = await prisma.festival.findMany({
      where: { location: { not: null }, geocode_attempts: { lt: maxAttempts } },
      select: CANDIDATE_SELECT,
      orderBy: { updated_at: "desc" },
    });
    return rows
      .filter((festival) => isDue(festival, maxAttempts))
      .sort((left, right) => priorityRank(left.workflow_state) - priorityRank(right.workflow_state))
      .slice(0, limit);
  },

  async countGeocodeCandidates({ maxAttempts }) {
    const rows = await prisma.festival.findMany({
      where: { location: { not: null }, geocode_attempts: { lt: maxAttempts } },
      select: { latitude: true, location: true, geocoded_location: true, geocode_attempts: true },
    });
    return rows.filter((festival) => isDue(festival, maxAttempts)).length;
  },

  findForGeocode(id) {
    return prisma.festival.findUnique({ where: { id }, select: CANDIDATE_SELECT });
  },

  /**
   * Records the outcome of one attempt.
   *
   * Deliberately writes only coordinate and diagnostic columns, never `revision` or
   * `workflow_state`. `Festival_audit_commit_trigger` fires only when one of those two changes,
   * so a background write needs no transition row, no revision snapshot, and no workflow
   * notification — which is what lets this run without an editor in the loop.
   */
  recordGeocodeAttempt(id, patch) {
    return prisma.festival.update({
      where: { id },
      data: { ...patch, geocode_attempted_at: new Date(), geocode_attempts: { increment: 1 } },
    });
  },
};
