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

/* Placeholder sponsor creatives. These are self-hosted SVG ads that fill the reserved
 * rail/footer real estate on the public site until real sponsorship contracts land; swap
 * an entry's `imageUrl`/`href` for the sold creative without touching `AdSlot` or the
 * layouts. An empty slot still renders nothing, so removing every entry restores the
 * unsold, chrome-free layout the client originally asked for. */
const PLACEMENTS = Object.freeze({
  [SPONSOR_SLOTS.LEFT_RAIL]: Object.freeze([
    {
      name: "Alston-Beech Foundation",
      imageUrl: "/ads/rail-sponsor-a.svg",
      alt: "Alston-Beech Foundation, presenting sponsor of community festivals",
      width: 160,
      height: 600,
    },
  ]),
  [SPONSOR_SLOTS.RIGHT_RAIL]: Object.freeze([
    {
      name: "PECO Powering the Arts",
      imageUrl: "/ads/rail-sponsor-b.svg",
      alt: "PECO Powering the Arts, energizing Philadelphia's stages and festivals",
      width: 160,
      height: 600,
    },
  ]),
  [SPONSOR_SLOTS.FOOTER]: Object.freeze([
    {
      name: "Philadelphia Activities Fund",
      imageUrl: "/ads/footer-leaderboard.svg",
      alt: "Philadelphia Activities Fund, supporting the festivals we love",
      width: 728,
      height: 90,
    },
  ]),
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
