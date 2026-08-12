import { DEFAULT_NAVIGATION_LINKS } from "./navigation-defaults";

/**
 * The navigation read path used by the E2E suite.
 *
 * Unlike every other feature, navigation runs inside the public layout, so *every* page in the
 * suite hits it. Without a fixture the whole run depends on the E2E database carrying the
 * `NavigationLink` table — and it does not: `playwright.config.js` falls back to its own
 * `save_philly_festivals_e2e` database, which no documented command migrates, while
 * `scripts/migrate-test.mjs` migrates whatever `DATABASE_URL` resolves to from the env files.
 * Those are two different databases locally, and only CI happens to make them the same by
 * exporting `DATABASE_URL` for the whole job.
 *
 * The visible symptom was not a broken page — the source's fallback did its job and the menu
 * rendered — but a Prisma "table does not exist" error logged on every single render, which
 * `festival-map.spec.js` correctly reported as a console error.
 *
 * Returning the shipped defaults as ordinary rows keeps the real mapping and private-href
 * filtering in `toPublicNavigation` under test, rather than short-circuiting to the defaults.
 */
export function navigationE2ERepository(value = process.env.NAVIGATION_E2E_FIXTURE) {
  if (value !== "1" || process.env.NODE_ENV === "production") return null;

  return {
    listVisible: async () =>
      DEFAULT_NAVIGATION_LINKS.map((link, index) => ({
        ...link,
        id: `e2e-nav-${index}`,
        created_at: new Date("2026-01-01T00:00:00.000Z"),
        updated_at: new Date("2026-01-01T00:00:00.000Z"),
      })),
  };
}
