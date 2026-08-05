import { createHash, timingSafeEqual } from "node:crypto";

export function constantTimeSocialFeedSecretMatches(provided, expected) {
  if (typeof provided !== "string" || typeof expected !== "string" || !provided || !expected) return false;
  const left = createHash("sha256").update(provided).digest();
  const right = createHash("sha256").update(expected).digest();
  return timingSafeEqual(left, right);
}

export function authorizeSocialFeedSync(request, secret = process.env.SOCIAL_FEED_SYNC_SECRET) {
  const match = (request.headers.get("authorization") || "").match(/^Bearer ([^\s]+)$/);
  return Boolean(match && constantTimeSocialFeedSecretMatches(match[1], secret));
}

export function redactSocialFeedError(error) {
  const code = typeof error === "string" ? error : error?.code;
  return /^[a-z0-9_]{1,80}$/.test(code || "") ? code : "provider_error";
}
