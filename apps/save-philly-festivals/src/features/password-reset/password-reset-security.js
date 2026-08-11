import { enforcePublicMutationOrigin, extractTrustedRequestIp } from "@/features/public-mutation/public-mutation-security";

export { enforcePublicMutationOrigin as enforcePasswordResetOrigin, extractTrustedRequestIp };

const WINDOW_MS = 15 * 60_000;
const LIMITS = Object.freeze({ password_reset_request: 5, password_reset_confirm: 10 });
const MAX_BUCKETS = 5_000;
const buckets = new Map();

/**
 * Per-client throttle for the two unauthenticated reset endpoints.
 *
 * Reuses `extractTrustedRequestIp`, which returns "unknown" unless `TRUSTED_PROXY_HOPS` is
 * configured, and an unknown identity is not throttled here. That is a deliberate choice rather
 * than an oversight: the alternative — bucketing every unidentifiable caller together — would let
 * one attacker exhaust a shared bucket and deny password recovery to everyone at once. The
 * per-account ceiling in the service layer is what bounds abuse when the client cannot be
 * identified, and it cannot be evaded by rotating addresses.
 *
 * Unlike `publicMutationGuard`, there is no `edge_rate_limit_unverified` 503 gate on this path.
 * Account recovery failing closed on an unset environment flag would lock out the very people who
 * need it, including the administrator who would otherwise fix the flag.
 */
export const localPasswordResetRateLimiter = Object.freeze({
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

export function resetLocalPasswordResetRateLimiter() {
  buckets.clear();
}
