import { randomUUID } from "node:crypto";

import { prisma } from "@/lib/db";

export class PasswordResetError extends Error {
  constructor(message, statusCode = 400, code = "invalid_request") {
    super(message);
    this.name = "PasswordResetError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

export const passwordResetRepository = {
  /** Status is selected because a deactivated account must not be able to reset its way back in. */
  findUserByEmail(email) {
    return prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, status: true },
    });
  },

  /**
   * Issues a token, retiring every other live token for the account in the same transaction.
   *
   * Superseding matters: without it, each request adds another valid key to the same door, so a
   * user who clicks "forgot password" five times leaves five working links in their mailbox and
   * the oldest stays usable for its full TTL.
   */
  createToken({ userId, tokenHash, expiresAt, now = new Date() }) {
    return prisma.$transaction(async (transaction) => {
      await transaction.passwordResetToken.updateMany({
        where: { user_id: userId, consumed_at: null, expires_at: { gt: now } },
        data: { consumed_at: now },
      });
      return transaction.passwordResetToken.create({
        data: { id: randomUUID(), user_id: userId, token_hash: tokenHash, expires_at: expiresAt },
        select: { id: true, expires_at: true },
      });
    });
  },

  countRecentTokensForUser({ userId, since }) {
    return prisma.passwordResetToken.count({
      where: { user_id: userId, created_at: { gte: since } },
    });
  },

  /**
   * Redeems a token and rewrites the password in one transaction.
   *
   * The consuming update is a conditional `updateMany` on `consumed_at: null` rather than a
   * read-then-write, so two requests racing the same token cannot both pass the check and set two
   * different passwords — the loser sees `count === 0` and is rejected.
   *
   * `password_changed_at` is stamped here and nowhere else; it is what invalidates sessions issued
   * before this moment. `revision` is deliberately left alone — see the migration comment.
   */
  consumeTokenAndSetPassword({ tokenHash, passwordHash, now = new Date() }) {
    return prisma.$transaction(async (transaction) => {
      const token = await transaction.passwordResetToken.findUnique({
        where: { token_hash: tokenHash },
        select: {
          id: true,
          user_id: true,
          expires_at: true,
          consumed_at: true,
          user: { select: { id: true, email: true, status: true } },
        },
      });
      if (!token) throw new PasswordResetError("This reset link is no longer valid.", 400, "invalid_token");
      if (token.consumed_at) throw new PasswordResetError("This reset link has already been used.", 400, "invalid_token");
      if (token.expires_at <= now) throw new PasswordResetError("This reset link has expired.", 400, "expired_token");
      if (token.user.status !== "active") {
        throw new PasswordResetError("This account cannot be recovered here. Contact an administrator.", 403, "account_inactive");
      }

      const claimed = await transaction.passwordResetToken.updateMany({
        where: { id: token.id, consumed_at: null },
        data: { consumed_at: now },
      });
      if (claimed.count !== 1) {
        throw new PasswordResetError("This reset link has already been used.", 400, "invalid_token");
      }

      await transaction.user.update({
        where: { id: token.user_id },
        data: { password_hash: passwordHash, password_changed_at: now },
      });

      return { userId: token.user_id, email: token.user.email };
    });
  },
};
