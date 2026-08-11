-- Self-service password reset.
--
-- Two pieces: a hashed, single-use, expiring token ledger, and a `password_changed_at` stamp on
-- User that lets the session layer reject JWTs minted before a reset.
--
-- `password_changed_at` is a separate column rather than a `revision` bump on purpose.
-- `User_account_revision_trigger` raises 'User account revision cannot change without a role or
-- status transition', and `UserAccountAuditAction` has no password action, so a password change
-- cannot legally move `revision` without widening the audit ledger's shape constraint. Keeping
-- the stamp separate leaves the account audit invariants untouched.

ALTER TABLE "User" ADD COLUMN "password_changed_at" TIMESTAMP(3);

CREATE TABLE "PasswordResetToken" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "token_hash" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "consumed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id"),
  -- Only ever a SHA-256 hex digest. A raw token reaching this column would be a leak.
  CONSTRAINT "PasswordResetToken_hash_is_sha256" CHECK ("token_hash" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "PasswordResetToken_expires_after_creation" CHECK ("expires_at" > "created_at"),
  CONSTRAINT "PasswordResetToken_consumed_after_creation" CHECK (
    "consumed_at" IS NULL OR "consumed_at" >= "created_at"
  )
);

CREATE UNIQUE INDEX "PasswordResetToken_token_hash_key" ON "PasswordResetToken"("token_hash");
CREATE INDEX "PasswordResetToken_user_id_created_at_idx" ON "PasswordResetToken"("user_id", "created_at");
CREATE INDEX "PasswordResetToken_expires_at_idx" ON "PasswordResetToken"("expires_at");

ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
