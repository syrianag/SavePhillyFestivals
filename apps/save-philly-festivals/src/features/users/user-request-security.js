import { enforceProducerMutationOrigin } from "@/features/producer-submission/producer-request-security";

const WINDOW_MS = 60_000;
const LIMIT = 30;
const MAX_BUCKETS = 5_000;
const buckets = new Map();

export function enforceUserManagementOrigin(request, siteUrl = process.env.NEXT_PUBLIC_SITE_URL, nodeEnv = process.env.NODE_ENV) {
  return enforceProducerMutationOrigin(request, siteUrl, nodeEnv);
}

export function userManagementEdgeRateLimitVerified(
  nodeEnv = process.env.NODE_ENV,
  value = process.env.USER_MANAGEMENT_EDGE_RATE_LIMIT_VERIFIED,
) {
  return nodeEnv !== "production" || value === "1";
}

export function consumeUserManagementRateLimit(userId, now = Date.now()) {
  const current = buckets.get(userId);
  if (!current || current.resetAt <= now) {
    if (!current && buckets.size >= MAX_BUCKETS) buckets.delete(buckets.keys().next().value);
    buckets.set(userId, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  current.count += 1;
  return current.count <= LIMIT;
}

export function resetUserManagementRateLimit() {
  buckets.clear();
}
