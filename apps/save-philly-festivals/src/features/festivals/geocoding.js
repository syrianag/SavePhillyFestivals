/**
 * Pure geocoding helpers — no Prisma, no fetch.
 *
 * Extracted so the batch script, the scheduled sweep, and the map all share one definition of
 * "is this coordinate plausible", and so the query-building rules can be unit tested. Every
 * function here is deterministic.
 */

/**
 * The greater Philadelphia region, not the city.
 *
 * The catalog is a regional festival guide: Doylestown PA, Wilmington DE, Bryn Mawr PA,
 * Schwenksville PA, and Atlantic City NJ are all real entries. The previous city-only bounding
 * box rejected correct geocodes for those as `outside_philadelphia`. This box still rejects the
 * classic wrong answers — Philadelphia MS (33.5, -90.1), Philadelphia NY (44.2, -75.7), and
 * Philadelphia TN (35.4, -84.4) all fall outside it.
 */
export const DELAWARE_VALLEY_BOUNDS = Object.freeze({
  minLat: 38.9,
  maxLat: 40.8,
  minLon: -76.3,
  maxLon: -74.0,
});

export function isWithinRegion(latitude, longitude, bounds = DELAWARE_VALLEY_BOUNDS) {
  return (
    Number.isFinite(latitude) && Number.isFinite(longitude)
    && latitude >= bounds.minLat && latitude <= bounds.maxLat
    && longitude >= bounds.minLon && longitude <= bounds.maxLon
  );
}

/** A coordinate pair that could plausibly be plotted at all, independent of region. */
export function isPlottableCoordinate(latitude, longitude) {
  return (
    Number.isFinite(latitude) && Number.isFinite(longitude)
    && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180
    /* (0, 0) is the null island — almost always a failed parse rather than a real location. */
    && !(latitude === 0 && longitude === 0)
  );
}

const STATE_CODES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FL", "GA", "HI", "ID", "IL", "IN", "IA",
  "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM",
  "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA",
  "WV", "WI", "WY",
];

const STATE_NAMES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware",
  "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky",
  "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi",
  "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey", "New Mexico",
  "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania",
  "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont",
  "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming",
];

/* Case-sensitive on purpose: a lowercase `in` or `or` is an English word, not Indiana or Oregon. */
const STATE_CODE_PATTERN = new RegExp(`\\b(${STATE_CODES.join("|")})\\b`);
const STATE_NAME_PATTERN = new RegExp(`\\b(${STATE_NAMES.join("|")})\\b`, "i");
const ZIP_PATTERN = /\b\d{5}(?:-\d{4})?\b/;
const COUNTRY_SUFFIX_PATTERN = /\b(USA|U\.S\.A\.|United States)\b\.?\s*$/i;

/**
 * Locations that name no place a geocoder could resolve.
 *
 * Returning null for these is not just tidiness: each avoided lookup is 1.1 seconds of throttle
 * that would otherwise be spent guaranteeing a `no_match`. "Various Locations" is a real value
 * in the imported data.
 */
const UNMAPPABLE_PATTERNS = [
  /\bvarious\b/i,
  /\bcitywide\b/i,
  /\bcity[- ]wide\b/i,
  /\bmultiple locations?\b/i,
  /\bvarious venues?\b/i,
  /\bt\.?b\.?[adc]\.?\b/i,
  /\bto be (announced|determined|confirmed)\b/i,
  /\bonline\b/i,
  /\bvirtual\b/i,
  /^\s*n\/?a\s*$/i,
];

export function isUnmappableLocation(location) {
  const text = String(location ?? "").trim();
  if (!text) return true;
  return UNMAPPABLE_PATTERNS.some((pattern) => pattern.test(text));
}

function normalizeLocation(location) {
  return String(location ?? "")
    .replace(/\s+/g, " ")
    .replace(/^at\s+/i, "")
    /* Trailing parentheticals are almost always notes — "(rain date June 3)", "(members only)" —
     * and they reliably break a match. */
    .replace(/\s*\([^)]*\)\s*$/, "")
    .replace(/[;|]/g, ",")
    .replace(/\s*,\s*/g, ", ")
    .replace(/,\s*,+/g, ", ")
    .replace(/^[,\s]+|[,\s]+$/g, "")
    .trim();
}

/**
 * The query string to send for a festival.
 *
 * Returns null when the location names no resolvable place.
 *
 * The bug this replaces: the previous builder joined
 * `[location, city || "Philadelphia", state || "PA", "USA"]` unconditionally. `city` is never
 * null — the baseline migration defaults it to 'Philadelphia' — so a complete address became
 * "2201 Fairmount Ave, Philadelphia, PA 19130, United States, Philadelphia, PA, USA", which
 * Nominatim cannot match. City and state are now appended only when the location does not
 * already carry them.
 */
export function buildGeocodeQuery({ location, city, state } = {}) {
  if (isUnmappableLocation(location)) return null;
  const normalized = normalizeLocation(location);
  if (!normalized) return null;

  const hasPlace = STATE_CODE_PATTERN.test(normalized)
    || STATE_NAME_PATTERN.test(normalized)
    || ZIP_PATTERN.test(normalized);

  if (hasPlace) {
    return COUNTRY_SUFFIX_PATTERN.test(normalized) ? normalized : `${normalized}, USA`;
  }

  /* A bare venue name. The Philadelphia default is a reasonable prior for this catalog. */
  return [normalized, city || "Philadelphia", state || "PA", "USA"]
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .join(", ");
}

/**
 * A second, broader attempt after a `no_match`.
 *
 * Nominatim is strong on street addresses and weak on venue names, so dropping the leading venue
 * segment recovers a large share of failures: "Smith Memorial Playground, 3500 Reservoir Dr,
 * Philadelphia, PA" retries as "3500 Reservoir Dr, Philadelphia, PA, USA". Returns null when
 * there is nothing left to drop, so the caller skips the extra request.
 */
export function buildFallbackQuery({ location, city, state } = {}) {
  const normalized = normalizeLocation(location);
  const segments = normalized.split(",").map((part) => part.trim()).filter(Boolean);
  if (segments.length < 2) return null;

  const withoutVenue = segments.slice(1).join(", ");
  const rebuilt = buildGeocodeQuery({ location: withoutVenue, city, state });
  /* No point spending a request on a query identical to the one that just failed. */
  return rebuilt && rebuilt !== buildGeocodeQuery({ location, city, state }) ? rebuilt : null;
}

/**
 * Turns one Nominatim result into an accept/reject decision with a reason code.
 *
 * `addresstype` of `state` or `country` is rejected explicitly: when Nominatim cannot find the
 * address it will happily return the centroid of Pennsylvania, which lands inside the region box
 * and would otherwise be accepted as a real pin sitting in a field near Harrisburg.
 */
export function classifyGeocodeResult(result, bounds = DELAWARE_VALLEY_BOUNDS) {
  if (!result) return { ok: false, reason: "no_match" };

  const latitude = Number.parseFloat(result.lat);
  const longitude = Number.parseFloat(result.lon);
  if (!isPlottableCoordinate(latitude, longitude)) return { ok: false, reason: "invalid_coordinates" };

  const addressType = String(result.addresstype || result.type || "").toLowerCase();
  if (["state", "country", "region", "continent"].includes(addressType)) {
    return { ok: false, reason: "imprecise_match" };
  }

  if (!isWithinRegion(latitude, longitude, bounds)) return { ok: false, reason: "outside_region" };

  return { ok: true, latitude, longitude, reason: null };
}
