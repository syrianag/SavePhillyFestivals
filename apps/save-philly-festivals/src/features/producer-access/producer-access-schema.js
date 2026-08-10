import { z } from "zod";

export const PRODUCER_ACCESS_JSON_BODY_LIMIT = 16 * 1024;

/* Deliberately modest: an open registration endpoint is the one place an attacker can create
 * state without credentials, so every field is bounded. */
export const registrationSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.email().max(320).transform((value) => value.toLowerCase()),
  /* Length over composition rules — NIST guidance, and composition rules push people toward
   * predictable substitutions. bcrypt truncates past 72 bytes, so cap there rather than
   * silently ignoring the tail. */
  password: z.string().min(12).max(72),
}).strict();

export const accessRequestSchema = z.object({
  organization: z.string().trim().max(200).optional(),
  festival_name: z.string().trim().max(200).optional(),
  message: z.string().trim().max(2000).optional(),
}).strict();

export const accessDecisionSchema = z.object({
  decision: z.enum(["approved", "rejected"]),
  reason: z.string().trim().max(2000).optional(),
}).strict().superRefine((value, context) => {
  /* A rejection with no explanation is unactionable for the applicant and unauditable later. */
  if (value.decision === "rejected" && !value.reason) {
    context.addIssue({ code: "custom", path: ["reason"], message: "A reason is required when rejecting a request" });
  }
});

export const emailTemplateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  subject: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(20000),
  description: z.string().trim().max(500).nullable().optional(),
  enabled: z.boolean().optional(),
}).strict();

export const emailTemplateCreateSchema = emailTemplateSchema.extend({
  key: z.string().trim().min(1).max(80).regex(/^[a-z0-9_]+$/, "Use lowercase letters, numbers, and underscores"),
});
