/**
 * Sponsor placements for the public ad slots.
 *
 * Sponsor creatives are **self-hosted**. `next.config.mjs` sets a strict CSP with no
 * external script or style origins, so a third-party ad tag (Google Ad Manager, etc.)
 * is blocked by design. Images must live under `public/` or an origin the CSP allows.
 *
 * This module is the single seam between placement data and presentation: today it
 * returns a constant, and the admin-managed version replaces the body of
 * `getSponsorsForSlot` with a repository read without touching `AdSlot` or any layout.
 */

export const SPONSOR_SLOTS = Object.freeze({
  LEFT_RAIL: "left_rail",
  RIGHT_RAIL: "right_rail",
  FOOTER: "footer",
});

/* Empty by default: an unsold slot must render nothing at all rather than a blank
 * placeholder box, which is what the client explicitly asked for. */
const PLACEMENTS = Object.freeze({
  [SPONSOR_SLOTS.LEFT_RAIL]: Object.freeze([]),
  [SPONSOR_SLOTS.RIGHT_RAIL]: Object.freeze([]),
  [SPONSOR_SLOTS.FOOTER]: Object.freeze([]),
});

/**
 * Active sponsors for one slot, in display order.
 *
 * @param {string} slot one of `SPONSOR_SLOTS`
 * @returns {Array<{ name: string, imageUrl: string, href?: string, alt?: string }>}
 */
export function getSponsorsForSlot(slot) {
  const placements = PLACEMENTS[slot];
  if (!placements) return [];
  return placements.filter((sponsor) => sponsor?.imageUrl && sponsor?.name);
}
