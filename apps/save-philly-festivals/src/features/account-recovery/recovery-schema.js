import { z } from "zod";

import { userPasswordSchema } from "@/features/users/user-schema";

const emailSchema = z.string().trim().toLowerCase().min(3).max(254).email();
const nameSchema = z.string().trim().min(1).max(100);

export const RECOVERY_JSON_BODY_LIMIT = 8 * 1024;

// POST /api/auth/forgot-password — request a reset link for an account email.
export const requestPasswordResetSchema = z.object({
  email: emailSchema,
}).strict();

// POST /api/auth/reset-password — redeem a reset token and set a new password.
export const completePasswordResetSchema = z.object({
  token: z.string().trim().min(20).max(200),
  password: userPasswordSchema,
}).strict();

// POST /api/auth/forgot-email — recover which email(s) an account uses.
// The framework matches on the account holder's name; the detail of the
// matching rule is settled when the flow is fully specified.
export const forgotEmailSchema = z.object({
  name: nameSchema,
  knownEmail: emailSchema.optional(),
}).strict();
