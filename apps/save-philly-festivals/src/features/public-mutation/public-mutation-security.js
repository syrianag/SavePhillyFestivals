import { Buffer } from "node:buffer";
import { isIP } from "node:net";

import { NextResponse } from "next/server";

export const PUBLIC_MUTATION_JSON_BODY_LIMIT = 32 * 1024;

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);
const WINDOW_MS = 60_000;
const MAX_BUCKETS = 5_000;
const LIMITS = Object.freeze({
  schedule_email: 10,
  organizer_consent: 10,
  organizer_consent_eligibility: 60,
  organizer_consent_revoke: 10,
  contact: 10,
  producer_register: 10,
});
const buckets = new Map();

function json(body, status) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

function normalizeOrigin(value) {
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function resolvePublicMutationCanonicalOrigin({ configuredSiteUrl, requestUrl, nodeEnv } = {}) {
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

export function enforcePublicMutationOrigin(request, configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL, nodeEnv = process.env.NODE_ENV) {
  const expected = resolvePublicMutationCanonicalOrigin({ configuredSiteUrl, requestUrl: request.url, nodeEnv });
  const origin = normalizeOrigin(request.headers.get("origin"));
  const fetchSite = request.headers.get("sec-fetch-site")?.toLowerCase();
  return Boolean(expected && origin === expected && (!fetchSite || fetchSite === "same-origin"));
}

/* Generic trusted-client identity for public mutation throttling. This intentionally lives
 * outside any single feature so unrelated public routes never depend on the consent module. */
export function extractTrustedRequestIp(
  request,
  trustedProxyHops = process.env.TRUSTED_PROXY_HOPS ?? process.env.CONSENT_TRUSTED_PROXY_HOPS,
) {
  const hops = Number.parseInt(trustedProxyHops || "0", 10);
  if (!Number.isInteger(hops) || hops < 1 || hops > 10) return "unknown";
  const chain = (request.headers.get("x-forwarded-for") || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const candidate = chain.at(-hops);
  return candidate && isIP(candidate) ? candidate : "unknown";
}

export function publicMutationEdgeRateLimitVerified(
  nodeEnv = process.env.NODE_ENV,
  value = process.env.PUBLIC_MUTATION_EDGE_RATE_LIMIT_VERIFIED,
) {
  return nodeEnv !== "production" || value === "1";
}

export const localPublicMutationRateLimiter = Object.freeze({
  consume({ identifier, operation, now = Date.now() }) {
    const limit = LIMITS[operation];
    if (!limit || !identifier || identifier === "unknown") return true;
    const key = `${operation}:${identifier}`;
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

export function resetLocalPublicMutationRateLimiter() {
  buckets.clear();
}

export function publicMutationGuard(request, {
  siteUrl = process.env.NEXT_PUBLIC_SITE_URL,
  nodeEnv = process.env.NODE_ENV,
  edgeRateLimitVerified = publicMutationEdgeRateLimitVerified(nodeEnv),
  rateLimiter = localPublicMutationRateLimiter,
  identifier = "unknown",
  operation,
} = {}) {
  if (!enforcePublicMutationOrigin(request, siteUrl, nodeEnv)) {
    return json({ error: "Cross-origin request rejected." }, 403);
  }
  if (!edgeRateLimitVerified) {
    return json({ error: "This request is unavailable until edge rate limiting is verified.", code: "edge_rate_limit_unverified" }, 503);
  }
  if (rateLimiter?.consume?.({ identifier, operation }) === false) {
    return json({ error: "Too many requests. Try again later." }, 429);
  }
  return null;
}

function contentLength(request) {
  const raw = request.headers.get("content-length");
  if (raw === null || !/^\d+$/.test(raw)) return null;
  const value = Number(raw);
  return Number.isSafeInteger(value) ? value : null;
}

async function readBoundedText(request, limit) {
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks = [];
  let byteLength = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    byteLength += value.byteLength;
    if (byteLength > limit) {
      await reader.cancel();
      return null;
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks, byteLength).toString("utf8");
}

export async function parsePublicMutationJson(request, limit = PUBLIC_MUTATION_JSON_BODY_LIMIT) {
  const mediaType = request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
  if (mediaType !== "application/json") return { response: json({ error: "Content-Type must be application/json." }, 415) };
  if ((contentLength(request) ?? 0) > limit) return { response: json({ error: "Request body is too large." }, 413) };
  const text = await readBoundedText(request, limit).catch(() => null);
  if (text === null) return { response: json({ error: "Request body is too large." }, 413) };
  try {
    return { data: JSON.parse(text) };
  } catch {
    return { response: json({ error: "Request body must be valid JSON." }, 400) };
  }
}
