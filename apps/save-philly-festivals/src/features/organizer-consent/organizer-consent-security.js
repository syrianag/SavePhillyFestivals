import { createHash, timingSafeEqual } from "node:crypto";

import { extractTrustedRequestIp } from "@/features/public-mutation/public-mutation-security";

// Re-exported from the neutral public-mutation module so consent keeps one shared implementation.
export { extractTrustedRequestIp };

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



export function redactedOutboxError(errorCode) {
  return /^[a-z0-9_]{1,80}$/.test(errorCode || "") ? errorCode : "provider_error";
}
