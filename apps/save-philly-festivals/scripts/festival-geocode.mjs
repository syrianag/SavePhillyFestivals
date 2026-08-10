/**
 * Turn each festival's free-text `location` into map coordinates.
 *
 * The festival CSV contract carries no coordinates (11 fixed headers, none geographic), so
 * imported festivals arrive with `location` as prose like "Penn's Landing, Philadelphia".
 * The map needs latitude/longitude, and this is the only thing that produces them.
 *
 * Uses OpenStreetMap Nominatim: no API key, no account, and — unlike the Google and ArcGIS
 * JavaScript SDKs — nothing that has to load in the browser, so the app's strict CSP is
 * untouched. Nominatim's usage policy requires an identifying User-Agent and at most one
 * request per second; both are enforced below. Do not remove the throttle.
 *
 * Query building and result classification live in `src/features/festivals/geocoding.js` so
 * they are unit tested and shared with the scheduled sweep. Every attempt records why it
 * succeeded or failed, which is what makes coverage debuggable rather than guessable — run
 * `--report` to read the residue.
 *
 * Re-runs only process festivals that have no coordinates, or whose `location` has changed
 * since it was last geocoded. Run `dry-run` first.
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as sleep } from "node:timers/promises";

import { config } from "dotenv";

const appRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: [join(appRoot, ".env.local"), join(appRoot, ".env")], quiet: true });

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "SavePhillyFestivals/1.0 (https://savephillyfestivals.com)";
const MIN_REQUEST_INTERVAL_MS = 1100;
const GEOCODE_SOURCE = "nominatim";

function fail(code, message) {
  throw Object.assign(new Error(message), { code });
}

function usage() {
  return `Usage:
  festival-geocode.mjs dry-run [--limit <n>] [--state <workflow_state>] [--report]
  festival-geocode.mjs apply   [--limit <n>] [--state <workflow_state>] [--only <festivalId>]
                               [--max-attempts <n>] [--refresh]

Resolves Festival.location to latitude/longitude via OpenStreetMap Nominatim.

Processes festivals whose location has never been geocoded, or whose location text has changed
since it was (tracked in geocoded_location). --refresh reprocesses everything with a location.
--max-attempts skips rows that have already failed that many times.
--report prints every currently unresolved festival with the query that would be sent.

Rate limited to one request per ${MIN_REQUEST_INTERVAL_MS}ms per Nominatim's usage policy.
`;
}

function parseArgs(argv) {
  const mode = argv[0];
  if (!["dry-run", "apply"].includes(mode)) fail("invalid_command", "Mode must be dry-run or apply");
  const options = {};
  for (let index = 1; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) fail("invalid_argument", `Unexpected argument: ${token}`);
    const key = token.slice(2).replaceAll("-", "_");
    if (key === "refresh" || key === "report") {
      options[key] = true;
      continue;
    }
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) fail("missing_argument", `Missing value for --${token.slice(2)}`);
    options[key] = value;
    index += 1;
  }
  return { mode, options };
}

async function requestGeocode(query, classify) {
  const url = new URL(NOMINATIM_URL);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "us");
  url.searchParams.set("addressdetails", "0");

  const response = await fetch(url, { headers: { "User-Agent": USER_AGENT, Accept: "application/json" } });
  if (response.status === 429) return { ok: false, reason: "rate_limited" };
  if (!response.ok) return { ok: false, reason: `http_${response.status}` };

  const results = await response.json();
  if (!Array.isArray(results) || results.length === 0) return { ok: false, reason: "no_match" };
  return classify(results[0]);
}

/**
 * Candidate rows.
 *
 * Prisma cannot compare two columns in `where`, so the "location changed since it was geocoded"
 * condition is applied in JS over the candidate set. At a few hundred festivals that is free; if
 * the catalog grows past a few thousand, move this to `$queryRaw` with
 * `geocoded_location IS DISTINCT FROM location`.
 */
async function loadCandidates(prisma, options) {
  const rows = await prisma.festival.findMany({
    where: {
      location: { not: null },
      ...(options.only ? { id: options.only } : {}),
      ...(options.state ? { workflow_state: options.state } : {}),
    },
    select: {
      id: true, name: true, location: true, city: true, state: true,
      latitude: true, geocoded_location: true, geocode_attempts: true,
      geocode_status: true, geocode_failure_reason: true,
    },
    orderBy: { name: "asc" },
  });

  const maxAttempts = options.max_attempts ? Number.parseInt(options.max_attempts, 10) : null;
  const filtered = rows.filter((festival) => {
    if (maxAttempts !== null && festival.geocode_attempts >= maxAttempts) return false;
    if (options.refresh) return true;
    if (festival.latitude === null) return true;
    return festival.geocoded_location !== festival.location;
  });

  return options.limit ? filtered.slice(0, Number.parseInt(options.limit, 10)) : filtered;
}

async function main() {
  const { mode, options } = parseArgs(process.argv.slice(2));
  if (!process.env.DATABASE_URL) fail("database_required", "DATABASE_URL is required");

  const { prisma } = await import("../src/lib/db.js");
  const { buildGeocodeQuery, buildFallbackQuery, classifyGeocodeResult } =
    await import("../src/features/festivals/geocoding.js");

  if (options.report) {
    const unresolved = await prisma.festival.findMany({
      where: { latitude: null, location: { not: null } },
      select: { name: true, location: true, city: true, state: true, geocode_failure_reason: true, geocode_attempts: true },
      orderBy: { name: "asc" },
    });
    console.log(`Unresolved festivals: ${unresolved.length}\n`);
    const byReason = {};
    for (const festival of unresolved) {
      const reason = festival.geocode_failure_reason || "never_attempted";
      byReason[reason] = (byReason[reason] || 0) + 1;
      console.log(`  [${reason}] ${festival.name}`);
      console.log(`      location: ${JSON.stringify(festival.location)}`);
      console.log(`      query:    ${JSON.stringify(buildGeocodeQuery(festival))}`);
    }
    console.log("\nBy reason:");
    for (const [reason, count] of Object.entries(byReason).sort(([, a], [, b]) => b - a)) {
      console.log(`  ${String(count).padStart(4)}  ${reason}`);
    }
    return;
  }

  const festivals = await loadCandidates(prisma, options);
  const missingLocation = await prisma.festival.count({ where: { location: null } });
  console.log(`Festivals to geocode: ${festivals.length}`);
  console.log(`Festivals with no location text (cannot be mapped): ${missingLocation}`);

  if (mode === "dry-run") {
    console.log("\nDry run — no requests are sent and nothing is written.");
    let unmappable = 0;
    for (const festival of festivals) {
      const query = buildGeocodeQuery(festival);
      if (query === null) unmappable += 1;
    }
    for (const festival of festivals.slice(0, 10)) {
      const query = buildGeocodeQuery(festival);
      console.log(`  ${festival.name} -> ${query === null ? "(unmappable, no request)" : JSON.stringify(query)}`);
    }
    if (festivals.length > 10) console.log(`  ...and ${festivals.length - 10} more`);
    const requests = festivals.length - unmappable;
    console.log(`\n${unmappable} need no request (unmappable location text).`);
    console.log(`Estimated runtime at 1 req/s: ~${Math.ceil((requests * MIN_REQUEST_INTERVAL_MS) / 1000)}s (before fallbacks)`);
    return;
  }

  let resolved = 0;
  let requestsSent = 0;
  const reasons = {};

  async function record(festival, patch) {
    await prisma.festival.update({
      where: { id: festival.id },
      data: {
        ...patch,
        geocode_attempted_at: new Date(),
        geocode_attempts: { increment: 1 },
      },
    });
  }

  for (const festival of festivals) {
    const query = buildGeocodeQuery(festival);

    /* Costs no request: the location text names no resolvable place. */
    if (query === null) {
      reasons.unmappable_location = (reasons.unmappable_location || 0) + 1;
      await record(festival, { geocode_status: "failed", geocode_failure_reason: "unmappable_location" });
      console.log(`  unresolved: ${festival.name} (unmappable_location)`);
      continue;
    }

    if (requestsSent > 0) await sleep(MIN_REQUEST_INTERVAL_MS);
    requestsSent += 1;

    let result;
    try {
      result = await requestGeocode(query, classifyGeocodeResult);
    } catch (error) {
      result = { ok: false, reason: `request_failed: ${error.message}` };
    }

    /* Nominatim is weak on venue names and strong on street addresses, so a no_match gets one
     * broader retry with the leading venue segment dropped. */
    if (!result.ok && result.reason === "no_match") {
      const fallback = buildFallbackQuery(festival);
      if (fallback) {
        await sleep(MIN_REQUEST_INTERVAL_MS);
        requestsSent += 1;
        try {
          const retry = await requestGeocode(fallback, classifyGeocodeResult);
          if (retry.ok) result = retry;
        } catch { /* keep the original no_match */ }
      }
    }

    if (!result.ok) {
      reasons[result.reason] = (reasons[result.reason] || 0) + 1;
      await record(festival, { geocode_status: "failed", geocode_failure_reason: result.reason });
      console.log(`  unresolved: ${festival.name} (${result.reason})`);
      continue;
    }

    await record(festival, {
      latitude: result.latitude,
      longitude: result.longitude,
      geocoded_at: new Date(),
      geocode_source: GEOCODE_SOURCE,
      geocoded_location: festival.location,
      geocode_status: "resolved",
      geocode_failure_reason: null,
    });
    resolved += 1;
    console.log(`  resolved: ${festival.name}`);
  }

  console.log(`\nGeocoded ${resolved}/${festivals.length}. Requests sent: ${requestsSent}.`);
  if (Object.keys(reasons).length > 0) {
    console.log("Unresolved by reason:");
    for (const [reason, count] of Object.entries(reasons).sort(([, a], [, b]) => b - a)) {
      console.log(`  ${String(count).padStart(4)}  ${reason}`);
    }
    console.log("Unresolved festivals keep null coordinates and are simply omitted from the map.");
    console.log("Run with --report to see the exact query sent for each.");
  }
}

main().catch((error) => {
  if (["invalid_command", "missing_argument", "invalid_argument"].includes(error?.code)) console.error(usage());
  console.error(`festival-geocode failed: ${error?.code || "error"}: ${error?.message}`);
  process.exitCode = 1;
});
