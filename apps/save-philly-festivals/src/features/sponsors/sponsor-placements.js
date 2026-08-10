/**
 * Sponsor placements for the public ad slot.
 *
 * Sponsor creatives are **self-hosted**. `next.config.mjs` sets a strict CSP with no
 * external script or style origins, so a third-party ad tag (Google Ad Manager, etc.)
 * is blocked by design. Images must live under `public/` or an origin the CSP allows.
 *
 * There is one placement: a band inside the site footer. Sponsorship started as three
 * slots (left rail, right rail, footer) and was consolidated to the footer alone, so
 * every sponsor sits in one reviewable strip instead of competing with festival content
 * down the sides of the page.
 *
 * This module is the single seam between placement data and presentation: today it
 * returns a constant, and the admin-managed version replaces the body of
 * `getSponsorsForSlot` with a repository read without touching `AdSlot` or `Footer`.
 */

export const SPONSOR_SLOTS = Object.freeze({
  LEFT_RAIL: "left_rail",
  RIGHT_RAIL: "right_rail",
  FOOTER: "footer",
});

/** Creative dimensions every footer sponsor tile is authored at. */
export const SPONSOR_TILE = Object.freeze({ width: 320, height: 120 });

/**
 * Authored creative dimensions per slot. Rails are vertical skyscrapers; the footer is a
 * horizontal band. Rail sponsors are never hidden on small screens — they relocate into the
 * footer band, which is why a rail creative still has to read acceptably beside footer tiles.
 */
export const SPONSOR_TILES = Object.freeze({
  [SPONSOR_SLOTS.LEFT_RAIL]: Object.freeze({ width: 160, height: 600 }),
  [SPONSOR_SLOTS.RIGHT_RAIL]: Object.freeze({ width: 160, height: 600 }),
  [SPONSOR_SLOTS.FOOTER]: SPONSOR_TILE,
});

/** Whether a record is renderable: it needs a name and either artwork or a pill color. */
export function selectRenderableSponsors(rows) {
  return (rows || []).filter((sponsor) => sponsor?.name && (sponsor.imageUrl || sponsor.pillColor));
}

/**
 * The live sponsor band.
 *
 * These three moved here from a hand-rolled "Our Sponsors" grid on the about page, where
 * they were the only sponsor recognition on the site and only visitors who opened that
 * page ever saw them. They have no artwork on file, so they render as name pills in the
 * organization's own colors; a sponsor who supplies a 320x120 creative gets `imageUrl`
 * instead and renders as a tile. Both forms live in the same band.
 *
 * An empty array here is still valid and still renders nothing at all — divider
 * included — rather than a blank placeholder box.
 */
const PLACEMENTS = Object.freeze({
  [SPONSOR_SLOTS.FOOTER]: Object.freeze([
    Object.freeze({ name: "Alston-Beech Foundation", pillColor: "#e0f2fe", textColor: "#0369a1" }),
    Object.freeze({ name: "Philadelphia Activities Fund", pillColor: "#ffedd5", textColor: "#c2410c" }),
    Object.freeze({ name: "PECO Powering the Arts", pillColor: "#fef9c3", textColor: "#a16207" }),
  ]),
});

/**
 * Extra demo tiles, appended to the live band only when `SPONSOR_DEMO=1` is set.
 *
 * The real sponsors above are name pills because none of them supplied artwork. These
 * exist so the client can see what a *paid* image placement looks like beside them
 * before any advertiser has been signed. Every business here is invented and every
 * creative carries a "DEMO AD" badge in the artwork itself — a real company's name
 * rendered as a paid placement would be a fabricated endorsement. `href` is
 * `example.com`, the domain IANA reserves for documentation, and is meant to be
 * replaced with the sponsor's real URL.
 *
 * Never set this flag in production.
 */
const DEMO_PLACEMENTS = Object.freeze({
  [SPONSOR_SLOTS.FOOTER]: Object.freeze([
    Object.freeze({
      name: "Franklin & Vine Roasters (demo)",
      imageUrl: "/sponsors/demo/franklin-vine-320x120.svg",
      href: "https://example.com",
      alt: "Demo sponsor: Franklin & Vine Roasters, small-batch coffee roasted in Philly",
      ...SPONSOR_TILE,
    }),
    Object.freeze({
      name: "Rowhouse Print Co. (demo)",
      imageUrl: "/sponsors/demo/rowhouse-print-320x120.svg",
      href: "https://example.com",
      alt: "Demo sponsor: Rowhouse Print Co., banners and tees for your festival",
      ...SPONSOR_TILE,
    }),
    Object.freeze({
      name: "Delaware Ave Sound Co. (demo)",
      imageUrl: "/sponsors/demo/delaware-ave-sound-320x120.svg",
      href: "https://example.com",
      alt: "Demo sponsor: Delaware Ave Sound Co., sound and staging for street fests",
      ...SPONSOR_TILE,
    }),
  ]),
});

/**
 * Whether demo creatives stand in for real sponsors.
 *
 * Read per call rather than at module load so toggling the flag does not depend on
 * import order, and so tests can flip it without resetting the module registry.
 */
export function isDemoMode() {
  return process.env.SPONSOR_DEMO === "1";
}

/**
 * Active sponsors for one slot, in display order.
 *
 * Real placements come first; demo tiles are appended after them so the band always
 * leads with the organization's actual sponsors.
 *
 * A sponsor needs a name, and renders as an image tile when it has `imageUrl` or as a
 * name pill when it has `pillColor` — anything with neither is dropped rather than
 * rendered as an empty card.
 *
 * @param {string} slot one of `SPONSOR_SLOTS`
 * @returns {Array<{ name: string, imageUrl?: string, pillColor?: string, textColor?: string, href?: string, alt?: string }>}
 */
export function getSponsorsForSlot(slot) {
  const placements = [...(PLACEMENTS[slot] || []), ...(isDemoMode() ? DEMO_PLACEMENTS[slot] || [] : [])];
  return selectRenderableSponsors(placements);
}
