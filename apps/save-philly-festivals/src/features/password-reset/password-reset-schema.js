import { z } from "zod";

export const PASSWORD_RESET_JSON_BODY_LIMIT = 8 * 1024;

/** 30 minutes. Long enough to survive a slow mail hop, short enough that a mailbox left open on
 * a shared machine is not a standing account takeover. */
export const PASSWORD_RESET_TTL_MS = 30 * 60_000;

/* Kept byte-identical in policy to `registrationSchema.password` in producer-access: length over
 * composition (NIST), capped at bcrypt's 72-byte truncation point rather than silently ignoring
 * the tail. A reset that accepted a password the login form would reject — or vice versa — would
 * lock people out of the account they just recovered. */
export const passwordResetPasswordSchema = z.string().min(12).max(72);

export const passwordResetRequestSchema = z.object({
  email: z.string().trim().toLowerCase().min(3).max(320).email(),
}).strict();

export const passwordResetConfirmSchema = z.object({
  /* 32 random bytes, base64url. Bounded so a multi-megabyte "token" never reaches the hasher. */
  token: z.string().trim().min(20).max(200),
  password: passwordResetPasswordSchema,
}).strict();
