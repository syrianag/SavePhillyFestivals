import { cache } from "react";

import { getSponsorsForSlot, SPONSOR_SLOTS } from "./sponsor-placements";

const ALL_SLOTS = Object.values(SPONSOR_SLOTS);

/**
 * Placements for the public ad slots, read once per request.
 *
 * `AdSlot` renders up to three times per page (two rails plus the footer band), and it sits in
 * the root layout, so an uncached read would be three queries on every public page load.
 *
 * Falls back to the built-in constants whenever the database yields nothing or the query fails.
 * That fallback is not optional: this runs inside the root layout, so an unhandled rejection
 * here would take down every public page, and an empty result would silently blank the sponsor
 * band that the client is being shown.
 */
export const resolveSponsorPlacements = cache(async () => {
  const fallback = Object.fromEntries(ALL_SLOTS.map((slot) => [slot, getSponsorsForSlot(slot)]));
  try {
    const { sponsorRepository } = await import("./sponsor-repository");
    const { renderableSponsorsBySlot } = await import("./sponsor-service");
    const grouped = await renderableSponsorsBySlot(ALL_SLOTS, { repository: sponsorRepository });
    if (!grouped) return fallback;
    /* Per slot, prefer managed rows but keep the constants for any slot with none, so adding a
     * single rail sponsor does not blank the existing footer band. */
    return Object.fromEntries(ALL_SLOTS.map((slot) => [slot, grouped[slot]?.length ? grouped[slot] : fallback[slot]]));
  } catch (error) {
    console.error("[SPONSORS] Placement lookup failed; falling back to built-in placements.", error?.message);
    return fallback;
  }
});

export async function sponsorsForSlots(slots) {
  const placements = await resolveSponsorPlacements();
  return slots.flatMap((slot) => placements[slot] || []);
}
