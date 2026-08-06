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
 * Results are cached in the database (`geocoded_at`, `geocode_source`), so re-runs only
 * geocode festivals that have never been resolved. Run `dry-run` first.
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

/* Philadelphia bounding box. Nominatim happily returns a Philadelphia in Mississippi for a
 * vague query, so results outside these bounds are rejected rather than dropped on the map
 * in the wrong state. */
const PHILADELPHIA_BOUNDS = Object.freeze({ minLat: 39.85, maxLat: 40.15, minLon: -75.30, maxLon: -74.95 });

function fail(code, message) {
  throw Object.assign(new Error(message), { code });
}

function usage() {
  return `Usage:
  festival-geocode.mjs dry-run [--limit <n>]
  festival-geocode.mjs apply   [--limit <n>] [--refresh]

Resolves Festival.location to latitude/longitude via OpenStreetMap Nominatim.
Only festivals with a location and no existing coordinates are processed unless --refresh.
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
    if (key === "refresh") {
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

/** Free text plus the city/state we already know, which sharply improves match quality. */
function buildQuery(festival) {
  return [festival.location, festival.city || "Philadelphia", festival.state || "PA", "USA"]
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .join(", ");
}

function withinPhiladelphia(lat, lon) {
  return (
    lat >= PHILADELPHIA_BOUNDS.minLat && lat <= PHILADELPHIA_BOUNDS.maxLat &&
    lon >= PHILADELPHIA_BOUNDS.minLon && lon <= PHILADELPHIA_BOUNDS.maxLon
  );
}

async function geocode(query) {
  const url = new URL(NOMINATIM_URL);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "us");

  const response = await fetch(url, { headers: { "User-Agent": USER_AGENT, Accept: "application/json" } });
  if (response.status === 429) return { ok: false, reason: "rate_limited" };
  if (!response.ok) return { ok: false, reason: `http_${response.status}` };

  const results = await response.json();
  if (!Array.isArray(results) || results.length === 0) return { ok: false, reason: "no_match" };

  const latitude = Number.parseFloat(results[0].lat);
  const longitude = Number.parseFloat(results[0].lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return { ok: false, reason: "invalid_coordinates" };
  if (!withinPhiladelphia(latitude, longitude)) return { ok: false, reason: "outside_philadelphia" };

  return { ok: true, latitude, longitude };
}

async function main() {
  const { mode, options } = parseArgs(process.argv.slice(2));
  if (!process.env.DATABASE_URL) fail("database_required", "DATABASE_URL is required");

  const { prisma } = await import("../src/lib/db.js");

  const where = {
    location: { not: null },
    ...(options.refresh ? {} : { latitude: null }),
  };
  const festivals = await prisma.festival.findMany({
    where,
    select: { id: true, name: true, location: true, city: true, state: true },
    orderBy: { name: "asc" },
    ...(options.limit ? { take: Number.parseInt(options.limit, 10) } : {}),
  });

  const missingLocation = await prisma.festival.count({ where: { location: null } });
  console.log(`Festivals to geocode: ${festivals.length}`);
  console.log(`Festivals with no location text (cannot be mapped): ${missingLocation}`);

  if (mode === "dry-run") {
    console.log("\nDry run — no requests are sent and nothing is written.");
    for (const festival of festivals.slice(0, 10)) {
      console.log(`  ${festival.name} -> "${buildQuery(festival)}"`);
    }
    if (festivals.length > 10) console.log(`  ...and ${festivals.length - 10} more`);
    console.log(`\nEstimated runtime at 1 req/s: ~${Math.ceil((festivals.length * MIN_REQUEST_INTERVAL_MS) / 1000)}s`);
    return;
  }

  let resolved = 0;
  const failures = [];

  for (const [index, festival] of festivals.entries()) {
    if (index > 0) await sleep(MIN_REQUEST_INTERVAL_MS);

    const query = buildQuery(festival);
    let result;
    try {
      result = await geocode(query);
    } catch (error) {
      result = { ok: false, reason: `request_failed: ${error.message}` };
    }

    if (!result.ok) {
      failures.push({ name: festival.name, reason: result.reason });
      console.log(`  unresolved: ${festival.name} (${result.reason})`);
      continue;
    }

    await prisma.festival.update({
      where: { id: festival.id },
      data: {
        latitude: result.latitude,
        longitude: result.longitude,
        geocoded_at: new Date(),
        geocode_source: GEOCODE_SOURCE,
      },
    });
    resolved += 1;
    console.log(`  resolved: ${festival.name}`);
  }

  console.log(`\nGeocoded ${resolved}/${festivals.length}. Unresolved: ${failures.length}.`);
  if (failures.length > 0) {
    console.log("Unresolved festivals keep null coordinates and are simply omitted from the map.");
  }
}

main().catch((error) => {
  if (["invalid_command", "missing_argument", "invalid_argument"].includes(error?.code)) console.error(usage());
  console.error(`festival-geocode failed: ${error?.code || "error"}: ${error?.message}`);
  process.exitCode = 1;
});
