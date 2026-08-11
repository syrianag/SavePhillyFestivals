/**
 * Env-gated dependency swap for E2E, matching the discovery and producer fixtures.
 *
 * Returns `null` unless `PASSWORD_RESET_E2E_FIXTURE=1`, so production always resolves the real
 * repository. This exists so the reset endpoints can be driven in a browser without a mail provider
 * and without depending on rows in the E2E database.
 *
 * It deliberately provides NO way to read back an issued token. Handing the raw token to the test
 * process would mean either returning it in an HTTP response or serving it from a fixture-only
 * endpoint, and either one becomes an account-takeover vector the moment the flag is set somewhere
 * it shouldn't be. Redemption is covered by unit tests and by the database constraints instead; the
 * browser specs cover what they uniquely can — that the pages render and the states display.
 */
const KNOWN_EMAIL = "e2e-reset@example.test";

const store = { users: new Map(), tokens: new Map() };

export function passwordResetE2EFixtureEnabled(value = process.env.PASSWORD_RESET_E2E_FIXTURE) {
  return value === "1";
}

export function resetPasswordResetE2EStore() {
  store.users.clear();
  store.tokens.clear();
}

/** The one address the specs may treat as registered. Anything else behaves as unknown. */
export function knownPasswordResetE2EEmail() {
  return KNOWN_EMAIL;
}

function seededUser() {
  if (!store.users.has(KNOWN_EMAIL)) {
    store.users.set(KNOWN_EMAIL, { id: "e2e-reset-user", email: KNOWN_EMAIL, name: "E2E Reset", status: "active" });
  }
  return store.users.get(KNOWN_EMAIL);
}

function fixtureRepository() {
  return {
    findUserByEmail(email) {
      return Promise.resolve(email === KNOWN_EMAIL ? seededUser() : null);
    },
    countRecentTokensForUser({ userId, since }) {
      const count = [...store.tokens.values()].filter(
        (token) => token.user_id === userId && token.created_at >= since,
      ).length;
      return Promise.resolve(count);
    },
    createToken({ userId, tokenHash, expiresAt, now = new Date() }) {
      for (const token of store.tokens.values()) {
        if (token.user_id === userId && !token.consumed_at && token.expires_at > now) token.consumed_at = now;
      }
      store.tokens.set(tokenHash, {
        user_id: userId, token_hash: tokenHash, expires_at: expiresAt, consumed_at: null, created_at: now,
      });
      return Promise.resolve({ id: tokenHash, expires_at: expiresAt });
    },
    async consumeTokenAndSetPassword({ tokenHash, now = new Date() }) {
      const { PasswordResetError } = await import("./password-reset-repository");
      const token = store.tokens.get(tokenHash);
      if (!token) throw new PasswordResetError("This reset link is no longer valid.", 400, "invalid_token");
      if (token.consumed_at) throw new PasswordResetError("This reset link has already been used.", 400, "invalid_token");
      if (token.expires_at <= now) throw new PasswordResetError("This reset link has expired.", 400, "expired_token");
      token.consumed_at = now;
      return { userId: token.user_id, email: KNOWN_EMAIL };
    },
  };
}

export function passwordResetE2EDependencies() {
  if (!passwordResetE2EFixtureEnabled()) return null;
  /* Swallows the message rather than mailing it. No token is retained. */
  return {
    repository: fixtureRepository(),
    notifier: () => Promise.resolve({ delivered: true, reason: null }),
  };
}
