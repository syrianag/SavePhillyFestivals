import { cache } from "react";

import { toPublicNavigation } from "./navigation-service";

/**
 * The header and footer menus, read once per request.
 *
 * Falls back to the shipped defaults whenever the table is empty or the query fails. That
 * fallback is not optional: this runs inside the public layout, so an unhandled rejection here
 * would take down every public page, and an empty result would leave the site with no
 * navigation at all — strictly worse than a slightly stale menu.
 *
 * `cache()` dedupes the read across the header and footer within a single request.
 */
export const resolvePublicNavigation = cache(async () => {
  try {
    const { navigationE2ERepository } = await import("./navigation-e2e-fixture");
    const fixture = navigationE2ERepository();
    if (fixture) return toPublicNavigation(await fixture.listVisible());

    const { navigationRepository } = await import("./navigation-repository");
    return toPublicNavigation(await navigationRepository.listVisible());
  } catch (error) {
    console.error("[NAVIGATION] Link lookup failed; falling back to the built-in menu.", error?.message);
    /* `toPublicNavigation([])` returns the defaults, so the failure path and the empty-table path
     * produce exactly the same menu rather than two shapes that can drift apart. */
    return toPublicNavigation([]);
  }
});
