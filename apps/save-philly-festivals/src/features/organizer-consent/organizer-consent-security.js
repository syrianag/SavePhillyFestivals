import { createHash, timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function constantTimeSecretMatches(provided, expected) {
  if (typeof provided !== "string" || typeof expected !== "string" || !provided || !expected) return false;
  const left = createHash("sha256").update(provided).digest();
  const right = createHash("sha256").update(expected).digest();
  return timingSafeEqual(left, right);
}

export function authorizeN8nRequest(request, secret = process.env.N8N_ORGANIZER_OUTBOX_SECRET) {
  const authorization = request.headers.get("authorization") || "";
  const match = authorization.match(/^Bearer ([^\s]+)$/);
  return Boolean(match && constantTimeSecretMatches(match[1], secret));
}

export function extractTrustedRequestIp(request, trustedProxyHops = process.env.CONSENT_TRUSTED_PROXY_HOPS) {
  const hops = Number.parseInt(trustedProxyHops || "0", 10);
  if (!Number.isInteger(hops) || hops < 1 || hops > 10) return "unknown";
  const chain = (request.headers.get("x-forwarded-for") || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const candidate = chain.at(-hops);
  return candidate && isIP(candidate) ? candidate : "unknown";
}

export function redactedOutboxError(errorCode) {
  return /^[a-z0-9_]{1,80}$/.test(errorCode || "") ? errorCode : "provider_error";
}
