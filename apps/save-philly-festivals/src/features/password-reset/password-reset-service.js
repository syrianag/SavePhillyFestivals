import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";

import { PASSWORD_RESET_TTL_MS } from "./password-reset-schema";
import { buildResetUrl, sendPasswordResetEmail } from "./password-reset-notifications";

/** Matches the cost used by registration and admin user creation. */
const BCRYPT_ROUNDS = 12;

/* A per-account ceiling on top of the per-IP limiter in the HTTP layer. The IP bucket stops one
 * client hammering the endpoint; this stops a distributed set of clients using us as a mail cannon
 * aimed at one person's inbox. */
const MAX_REQUESTS_PER_ACCOUNT = 5;
const ACCOUNT_WINDOW_MS = 60 * 60_000;

export function hashResetToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Accepts a reset request and reports success unconditionally.
 *
 * The response is identical whether the address is registered, unregistered, or deactivated. That
 * is the whole security property of this endpoint: any observable difference — body, status, or
 * timing — turns it into an account enumeration oracle. `registerAccount` in producer-access takes
 * the same approach for the same reason.
 */
export async function requestPasswordReset(input, { repository, now = new Date(), notifier = sendPasswordResetEmail, siteUrl } = {}) {
  const generic = { requested: true };
  const user = await repository.findUserByEmail(input.email);

  /* Deactivated accounts are skipped rather than rejected. Recovering one has to go through an
   * administrator, because the deactivation is a decision someone made and a password reset must
   * not quietly overturn it. */
  if (!user || user.status !== "active") return generic;

  const recent = await repository.countRecentTokensForUser({
    userId: user.id,
    since: new Date(now.getTime() - ACCOUNT_WINDOW_MS),
  });
  if (recent >= MAX_REQUESTS_PER_ACCOUNT) return generic;

  const token = randomBytes(32).toString("base64url");
  await repository.createToken({
    userId: user.id,
    tokenHash: hashResetToken(token),
    expiresAt: new Date(now.getTime() + PASSWORD_RESET_TTL_MS),
    now,
  });

  /* Delivery outcome is deliberately dropped. It is recorded by the mail layer's own logging, and
   * surfacing it here would leak whether the address resolved to an account. */
  await notifier({ to: user.email, resetUrl: buildResetUrl(token, siteUrl), name: user.name });

  return generic;
}

/**
 * Redeems a token and installs the new password.
 *
 * Unlike the request path this one reports real errors, because by this point the caller already
 * holds a token — telling them it expired reveals nothing they could not infer, and hiding it
 * strands a legitimate user on a dead link with no explanation.
 */
export async function confirmPasswordReset(input, { repository }) {
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  await repository.consumeTokenAndSetPassword({
    tokenHash: hashResetToken(input.token),
    passwordHash,
  });
  return { reset: true };
}
