import bcrypt from "bcryptjs";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { passwordChangedSinceIssue } from "@/lib/session-validity";
import {
  buildResetUrl,
  passwordResetEmailsEnabled,
  renderPasswordResetEmail,
} from "@/features/password-reset/password-reset-notifications";
import { PasswordResetError } from "@/features/password-reset/password-reset-repository";
import {
  passwordResetConfirmSchema,
  passwordResetRequestSchema,
} from "@/features/password-reset/password-reset-schema";
import {
  localPasswordResetRateLimiter,
  resetLocalPasswordResetRateLimiter,
} from "@/features/password-reset/password-reset-security";
import {
  confirmPasswordReset,
  hashResetToken,
  requestPasswordReset,
} from "@/features/password-reset/password-reset-service";

const NOW = new Date("2026-08-11T12:00:00.000Z");
const activeUser = { id: "user-1", email: "ada@example.test", name: "Ada", status: "active" };

function stubRepository(overrides = {}) {
  return {
    findUserByEmail: vi.fn(async () => activeUser),
    countRecentTokensForUser: vi.fn(async () => 0),
    createToken: vi.fn(async () => ({ id: "token-1", expires_at: NOW })),
    consumeTokenAndSetPassword: vi.fn(async () => ({ userId: activeUser.id, email: activeUser.email })),
    ...overrides,
  };
}

describe("password reset input contracts", () => {
  it("normalizes the requested email and bounds it", () => {
    expect(passwordResetRequestSchema.parse({ email: " Ada@Example.TEST " }).email).toBe("ada@example.test");
    expect(passwordResetRequestSchema.safeParse({ email: "not-an-email" }).success).toBe(false);
    expect(passwordResetRequestSchema.safeParse({ email: `${"a".repeat(320)}@x.test` }).success).toBe(false);
  });

  it("refuses unknown fields so a user id cannot be smuggled alongside the email", () => {
    expect(passwordResetRequestSchema.safeParse({ email: "ada@example.test", user_id: "user-9" }).success).toBe(false);
    expect(passwordResetConfirmSchema.safeParse({
      token: "t".repeat(43), password: "correct-horse-battery", role: "admin",
    }).success).toBe(false);
  });

  it("applies the same password rule the login form will enforce", () => {
    const token = "t".repeat(43);
    expect(passwordResetConfirmSchema.safeParse({ token, password: "correct-horse-battery" }).success).toBe(true);
    expect(passwordResetConfirmSchema.safeParse({ token, password: "short" }).success).toBe(false);
    /* Past bcrypt's 72-byte truncation the tail is ignored, so accepting it would be a lie. */
    expect(passwordResetConfirmSchema.safeParse({ token, password: "x".repeat(73) }).success).toBe(false);
  });

  it("rejects an absent or implausibly short token rather than hashing it", () => {
    expect(passwordResetConfirmSchema.safeParse({ password: "correct-horse-battery" }).success).toBe(false);
    expect(passwordResetConfirmSchema.safeParse({ token: "abc", password: "correct-horse-battery" }).success).toBe(false);
  });
});

describe("requesting a reset", () => {
  it("issues a token and mails a link for an active account", async () => {
    const repository = stubRepository();
    const notifier = vi.fn(async () => ({ delivered: true, reason: null }));

    const result = await requestPasswordReset({ email: activeUser.email }, {
      repository, notifier, now: NOW, siteUrl: "https://example.test",
    });

    expect(result).toEqual({ requested: true });
    expect(repository.createToken).toHaveBeenCalledOnce();
    const call = repository.createToken.mock.calls[0][0];
    expect(call.userId).toBe(activeUser.id);
    /* Only the digest is handed to the repository — the raw token exists solely in the email. */
    expect(call.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(call.expiresAt.getTime()).toBe(NOW.getTime() + 30 * 60_000);

    const mailed = notifier.mock.calls[0][0];
    expect(mailed.to).toBe(activeUser.email);
    const mailedToken = new URL(mailed.resetUrl).searchParams.get("token");
    expect(hashResetToken(mailedToken)).toBe(call.tokenHash);
  });

  it("reports the identical result for an unknown address and never issues a token", async () => {
    const repository = stubRepository({ findUserByEmail: vi.fn(async () => null) });
    const notifier = vi.fn();

    const result = await requestPasswordReset({ email: "nobody@example.test" }, { repository, notifier, now: NOW });

    expect(result).toEqual({ requested: true });
    expect(repository.createToken).not.toHaveBeenCalled();
    expect(notifier).not.toHaveBeenCalled();
  });

  it("refuses to recover a deactivated account, without saying so", async () => {
    const repository = stubRepository({
      findUserByEmail: vi.fn(async () => ({ ...activeUser, status: "deactivated" })),
    });
    const notifier = vi.fn();

    expect(await requestPasswordReset({ email: activeUser.email }, { repository, notifier, now: NOW }))
      .toEqual({ requested: true });
    expect(repository.createToken).not.toHaveBeenCalled();
    expect(notifier).not.toHaveBeenCalled();
  });

  it("stops being a mail cannon once an account hits its hourly ceiling", async () => {
    const repository = stubRepository({ countRecentTokensForUser: vi.fn(async () => 5) });
    const notifier = vi.fn();

    expect(await requestPasswordReset({ email: activeUser.email }, { repository, notifier, now: NOW }))
      .toEqual({ requested: true });
    expect(repository.createToken).not.toHaveBeenCalled();
    expect(notifier).not.toHaveBeenCalled();
  });

  it("still reports success when delivery fails, so the response reveals nothing", async () => {
    const repository = stubRepository();
    const notifier = vi.fn(async () => ({ delivered: false, reason: "provider_error" }));

    expect(await requestPasswordReset({ email: activeUser.email }, { repository, notifier, now: NOW }))
      .toEqual({ requested: true });
  });
});

describe("confirming a reset", () => {
  it("hashes the new password with bcrypt and redeems the token by digest", async () => {
    const repository = stubRepository();
    const token = "reset-token-value";

    expect(await confirmPasswordReset({ token, password: "correct-horse-battery" }, { repository }))
      .toEqual({ reset: true });

    const call = repository.consumeTokenAndSetPassword.mock.calls[0][0];
    expect(call.tokenHash).toBe(hashResetToken(token));
    /* The raw password must never reach the repository layer. */
    expect(call.passwordHash).not.toBe("correct-horse-battery");
    expect(await bcrypt.compare("correct-horse-battery", call.passwordHash)).toBe(true);
  });

  it("propagates a rejected token as a client error rather than a 500", async () => {
    const repository = stubRepository({
      consumeTokenAndSetPassword: vi.fn(async () => {
        throw new PasswordResetError("This reset link has expired.", 400, "expired_token");
      }),
    });

    await expect(confirmPasswordReset({ token: "t".repeat(43), password: "correct-horse-battery" }, { repository }))
      .rejects.toMatchObject({ statusCode: 400, code: "expired_token" });
  });
});

describe("reset link and email copy", () => {
  it("builds an absolute link without doubling the slash", () => {
    expect(buildResetUrl("abc", "https://example.test/")).toBe("https://example.test/reset-password?token=abc");
    expect(buildResetUrl("a b+c", "https://example.test")).toBe("https://example.test/reset-password?token=a%20b%2Bc");
  });

  it("escapes the recipient name instead of rendering it as markup", () => {
    const email = renderPasswordResetEmail({ resetUrl: "https://example.test/x", name: '<script>alert("x")</script>' });
    expect(email.html).not.toContain("<script>");
    expect(email.html).toContain("&lt;script&gt;");
  });

  it("says the link is single-use and time-boxed in both bodies", () => {
    const email = renderPasswordResetEmail({ resetUrl: "https://example.test/x", name: "Ada" });
    expect(email.html).toContain("expires in 30 minutes");
    expect(email.text).toContain("expires in 30 minutes");
  });

  it("stays disabled until its own flag and a provider key are both present", () => {
    expect(passwordResetEmailsEnabled("1", "re_key")).toBe(true);
    expect(passwordResetEmailsEnabled("0", "re_key")).toBe(false);
    expect(passwordResetEmailsEnabled(undefined, "re_key")).toBe(false);
    expect(passwordResetEmailsEnabled("1", undefined)).toBe(false);
  });
});

describe("reset endpoint throttling", () => {
  beforeEach(() => { resetLocalPasswordResetRateLimiter(); });

  it("caps requests per client and keeps the two operations in separate buckets", () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      expect(localPasswordResetRateLimiter.consume({ identifier: "203.0.113.7", operation: "password_reset_request" })).toBe(true);
    }
    expect(localPasswordResetRateLimiter.consume({ identifier: "203.0.113.7", operation: "password_reset_request" })).toBe(false);
    expect(localPasswordResetRateLimiter.consume({ identifier: "203.0.113.7", operation: "password_reset_confirm" })).toBe(true);
    expect(localPasswordResetRateLimiter.consume({ identifier: "203.0.113.9", operation: "password_reset_request" })).toBe(true);
  });

  it("does not bucket unidentifiable clients together, which would deny recovery to everyone", () => {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      expect(localPasswordResetRateLimiter.consume({ identifier: "unknown", operation: "password_reset_request" })).toBe(true);
    }
  });

  it("reopens the bucket once the window passes", () => {
    const start = NOW.getTime();
    for (let attempt = 0; attempt < 5; attempt += 1) {
      localPasswordResetRateLimiter.consume({ identifier: "198.51.100.4", operation: "password_reset_request", now: start });
    }
    expect(localPasswordResetRateLimiter.consume({ identifier: "198.51.100.4", operation: "password_reset_request", now: start })).toBe(false);
    expect(localPasswordResetRateLimiter.consume({
      identifier: "198.51.100.4", operation: "password_reset_request", now: start + 15 * 60_000 + 1,
    })).toBe(true);
  });
});

describe("session expiry after a reset", () => {
  const issued = "2026-08-11T12:00:00.000Z";

  it("keeps sessions valid for an account that has never reset", () => {
    expect(passwordChangedSinceIssue({ passwordChangedAt: null }, null)).toBe(false);
    /* Sessions minted before this feature shipped carry no claim; they must survive the deploy. */
    expect(passwordChangedSinceIssue({}, null)).toBe(false);
  });

  it("expires a session minted before the password changed", () => {
    expect(passwordChangedSinceIssue({ passwordChangedAt: issued }, new Date("2026-08-11T12:00:01.000Z"))).toBe(true);
    /* No claim at all plus a recorded change means the token predates the reset. */
    expect(passwordChangedSinceIssue({}, new Date(issued))).toBe(true);
    expect(passwordChangedSinceIssue({ passwordChangedAt: "not-a-date" }, new Date(issued))).toBe(true);
  });

  it("keeps the session created by signing in after the reset", () => {
    expect(passwordChangedSinceIssue({ passwordChangedAt: issued }, new Date(issued))).toBe(false);
    expect(passwordChangedSinceIssue({ passwordChangedAt: "2026-08-11T12:00:05.000Z" }, new Date(issued))).toBe(false);
  });
});
