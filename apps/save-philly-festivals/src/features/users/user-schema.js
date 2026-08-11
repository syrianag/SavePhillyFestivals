import { z } from "zod";

export const USER_JSON_BODY_LIMIT = 8 * 1024;
export const USER_ROLES = Object.freeze(["public", "producer", "admin", "super_admin"]);
export const USER_STATUSES = Object.freeze(["active", "deactivated"]);

export const userIdSchema = z.uuid();
export const userRoleSchema = z.enum(USER_ROLES);
export const userStatusSchema = z.enum(USER_STATUSES);

const nameSchema = z.string().trim().min(1).max(100);
const emailSchema = z.string().trim().toLowerCase().min(3).max(254).email();
/* The 72-byte cap is bcrypt's truncation point, not a UI preference. At the previous limit of 128
 * an admin could set a longer password whose tail was silently ignored, so two different strings
 * would both unlock the account and the extra characters bought nothing. This is stricter than
 * `registrationSchema` in producer-access, which deliberately drops the composition rules; the two
 * now at least agree on length. */
export const userPasswordSchema = z
  .string()
  .min(12)
  .max(72)
  .regex(/[a-z]/, "Password must include a lowercase letter.")
  .regex(/[A-Z]/, "Password must include an uppercase letter.")
  .regex(/[0-9]/, "Password must include a number.")
  .regex(/[^A-Za-z0-9]/, "Password must include a symbol.")
  .regex(/^\S+$/, "Password must not contain whitespace.");

export const createUserSchema = z.object({
  name: nameSchema.nullable().optional(),
  email: emailSchema,
  password: userPasswordSchema,
  role: userRoleSchema.default("public"),
}).strict();

export const updateUserSchema = z.object({
  role: userRoleSchema.optional(),
  status: userStatusSchema.optional(),
  reason: z.string().trim().min(1).max(500).optional(),
}).strict().superRefine((value, context) => {
  if (Number(value.role !== undefined) + Number(value.status !== undefined) !== 1) {
    context.addIssue({ code: "custom", message: "Exactly one of role or status is required." });
  }
});

export const listUsersQuerySchema = z.object({
  role: userRoleSchema.optional(),
  status: userStatusSchema.optional(),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
}).strict();
