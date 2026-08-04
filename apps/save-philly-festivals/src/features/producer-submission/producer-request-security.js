const WINDOW_MS = 60_000;
const LIMITS = Object.freeze({ create: 10, patch: 60, submit: 10, upload: 20 });
const buckets = new Map();
const MAX_BUCKETS = 5_000;
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

function normalizeOrigin(value) {
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function resolveProducerCanonicalOrigin({
  configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL,
  requestUrl,
  nodeEnv = process.env.NODE_ENV,
} = {}) {
  const configured = normalizeOrigin(configuredSiteUrl);
  if (configured) return configured;
  if (nodeEnv === "production") return null;

  try {
    const request = new URL(requestUrl);
    return LOCAL_HOSTS.has(request.hostname) ? request.origin : null;
  } catch {
    return null;
  }
}

export function enforceProducerMutationOrigin(request, configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL, nodeEnv = process.env.NODE_ENV) {
  const expected = resolveProducerCanonicalOrigin({ configuredSiteUrl, requestUrl: request.url, nodeEnv });
  const origin = normalizeOrigin(request.headers.get("origin"));
  const fetchSite = request.headers.get("sec-fetch-site")?.toLowerCase();
  return Boolean(expected && origin === expected && (!fetchSite || fetchSite === "same-origin"));
}

export function producerEdgeRateLimitVerified(
  nodeEnv = process.env.NODE_ENV,
  value = process.env.PRODUCER_EDGE_RATE_LIMIT_VERIFIED,
) {
  return nodeEnv !== "production" || value === "1";
}

export const localProducerRateLimiter = Object.freeze({
  consume({ userId, operation, now = Date.now() }) {
    const limit = LIMITS[operation];
    if (!limit) return true;
    const key = `${operation}:${userId}`;
    const current = buckets.get(key);
    if (!current || current.resetAt <= now) {
      if (!current && buckets.size >= MAX_BUCKETS) buckets.delete(buckets.keys().next().value);
      buckets.delete(key);
      buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
      return true;
    }
    current.count += 1;
    return current.count <= limit;
  },
});

export function resetLocalProducerRateLimiter() {
  buckets.clear();
}
