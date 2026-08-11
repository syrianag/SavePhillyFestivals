/**
 * Session-validity rules that must stay importable without side effects.
 *
 * Kept out of `src/lib/auth.js` on purpose: that module throws at import time when `AUTH_SECRET` is
 * unset and instantiates the Prisma client, so a unit test cannot load it to check this logic.
 */

/**
 * True when the account's password changed after this session was issued.
 *
 * Sessions are JWTs and there is no server-side session table to delete from, so a password reset
 * would otherwise leave every already-issued token working for its full lifetime — exactly the
 * tokens an attacker would be holding in the case that prompted the reset.
 *
 * A session predating this feature carries no claim while the account has no stamp, so both sides
 * are null and nothing is invalidated. Only an account with a recorded change can expire anything.
 */
export function passwordChangedSinceIssue(session, currentPasswordChangedAt) {
  if (!currentPasswordChangedAt) return false;
  const issued = session?.passwordChangedAt ? new Date(session.passwordChangedAt).getTime() : null;
  if (issued === null || Number.isNaN(issued)) return true;
  return issued < new Date(currentPasswordChangedAt).getTime();
}
