export class AccountRecoveryError extends Error {
  constructor(message, statusCode = 400, code = "invalid_request") {
    super(message);
    this.name = "AccountRecoveryError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

// Issued reset tokens are valid for 30 minutes.
export const PASSWORD_RESET_TOKEN_TTL_MS = 30 * 60 * 1000;

// A user may request no more than this many reset tokens per rolling window.
export const MAX_ACTIVE_RESET_TOKENS_PER_USER = 3;

// Anti-enumeration: responses are intentionally identical whether or not the
// email/name matches an account, so the endpoint cannot be used to probe users.
export const NEUTRAL_RECOVERY_MESSAGE = "If that account exists, we have sent a message to it.";
