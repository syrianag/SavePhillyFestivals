import { createHash, timingSafeEqual } from "node:crypto";

import {
  buildFallbackQuery,
  buildGeocodeQuery,
  classifyGeocodeResult,
} from "@/features/festivals/geocoding";

/**
 * Geocoding as a background sweep, plus a single on-demand lookup for editors.
 *
 * No geocoding happens in a user-facing request path. Nominatim's usage policy caps callers at
 * one request per second, so an inline lookup would put a deliberately slow third-party call
 * between a producer and their saved draft. The sweep absorbs that latency where nobody waits.
 *
 * Staleness needs no queue and no changes to any write path: a festival is due whenever
 * `geocoded_location` differs from its current `location`. That comparison self-heals across
 * producer submissions, editor edits, and CSV imports alike, because all of them write
 * `location` and none of them touch `geocoded_location`.
 */

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "SavePhillyFestivals/1.0 (https://savephillyfestivals.com)";
const MIN_REQUEST_INTERVAL_MS = 1100;
const GEOCODE_SOURCE = "nominatim";

/* Serverless invocations are time-capped, so a sweep does a handful of festivals and lets the
 * next scheduled run continue. At 1.1s per request this stays comfortably inside a 60s budget
 * even when every row needs a fallback lookup. */
export const DEFAULT_SWEEP_BATCH = 8;

/* Stop retrying a location that has failed repeatedly. Without this a permanently unresolvable
 * row is retried on every sweep forever, crowding out festivals that could still succeed. */
export const MAX_GEOCODE_ATTEMPTS = 4;

function constantTimeSecretMatches(provided, expected) {
  if (!provided || !expected) return false;
  const left = createHash("sha256").update(provided).digest();
  const right = createHash("sha256").update(expected).digest();
  return timingSafeEqual(left, right);
}

export function authorizeGeocodeSweep(request, secret = process.env.GEOCODE_SWEEP_SECRET) {
  const authorization = request.headers.get("authorization") || "";
  const match = authorization.match(/^Bearer ([^\s]+)$/);
  return Boolean(match && constantTimeSecretMatches(match[1], secret));
}

const sleep = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

async function requestGeocode(query, fetchImpl) {
  const url = new URL(NOMINATIM_URL);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "us");

  const response = await fetchImpl(url, { headers: { "User-Agent": USER_AGENT, Accept: "application/json" } });
  if (response.status === 429) return { ok: false, reason: "rate_limited" };
  if (!response.ok) return { ok: false, reason: `http_${response.status}` };
  const results = await response.json();
  if (!Array.isArray(results) || results.length === 0) return { ok: false, reason: "no_match" };
  return classifyGeocodeResult(results[0]);
}

/** Resolves one festival and records the outcome. Never throws — the caller reports the reason. */
export async function geocodeFestival(festival, { repository, fetchImpl = fetch, throttle = true }) {
  const query = buildGeocodeQuery(festival);
  if (query === null) {
    await repository.recordGeocodeAttempt(festival.id, {
      geocode_status: "failed",
      geocode_failure_reason: "unmappable_location",
    });
    return { ok: false, reason: "unmappable_location" };
  }

  let result;
  try {
    result = await requestGeocode(query, fetchImpl);
    if (!result.ok && result.reason === "no_match") {
      const fallback = buildFallbackQuery(festival);
      if (fallback) {
        if (throttle) await sleep(MIN_REQUEST_INTERVAL_MS);
        const retry = await requestGeocode(fallback, fetchImpl);
        if (retry.ok) result = retry;
      }
    }
  } catch (error) {
    result = { ok: false, reason: "request_failed" };
    console.error("[GEOCODE] Provider request failed.", error?.message);
  }

  if (!result.ok) {
    await repository.recordGeocodeAttempt(festival.id, {
      geocode_status: "failed",
      geocode_failure_reason: result.reason,
    });
    return result;
  }

  await repository.recordGeocodeAttempt(festival.id, {
    latitude: result.latitude,
    longitude: result.longitude,
    geocoded_at: new Date(),
    geocode_source: GEOCODE_SOURCE,
    geocoded_location: festival.location,
    geocode_status: "resolved",
    geocode_failure_reason: null,
  });
  return result;
}

/**
 * One scheduled batch.
 *
 * Published festivals are swept first: they are the only ones a visitor can currently see on
 * the map, so they are where a missing pin actually costs something.
 */
export async function runGeocodeSweep({ repository, batchSize = DEFAULT_SWEEP_BATCH, fetchImpl = fetch } = {}) {
  const due = await repository.findGeocodeCandidates({ limit: batchSize, maxAttempts: MAX_GEOCODE_ATTEMPTS });
  const outcome = { considered: due.length, resolved: 0, failed: 0, reasons: {} };

  for (const [index, festival] of due.entries()) {
    if (index > 0) await sleep(MIN_REQUEST_INTERVAL_MS);
    const result = await geocodeFestival(festival, { repository, fetchImpl });
    if (result.ok) {
      outcome.resolved += 1;
    } else {
      outcome.failed += 1;
      outcome.reasons[result.reason] = (outcome.reasons[result.reason] || 0) + 1;
    }
  }

  outcome.remaining = await repository.countGeocodeCandidates({ maxAttempts: MAX_GEOCODE_ATTEMPTS });
  return outcome;
}
