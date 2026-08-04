import { z } from "zod";
import {
  CONSENT_SOURCE,
  CONSENT_VERSION,
  ORGANIZER_PREFERENCES,
  PREFERENCE_VERSION,
} from "@/features/organizer-consent/organizer-consent-copy";

export {
  CONSENT_SOURCE,
  CONSENT_TEXT,
  CONSENT_VERSION,
  ORGANIZER_PREFERENCES,
  PREFERENCE_VERSION,
} from "@/features/organizer-consent/organizer-consent-copy";

const selectionItemSchema = z.object({
  type: z.enum(["festival", "event"]),
  id: z.string().trim().min(1).max(128),
}).strict();

export const consentSelectionSchema = z.object({
  version: z.literal(1),
  items: z.array(selectionItemSchema).min(1).max(100),
}).strict();

export const organizerEligibilitySchema = z.object({ selection: consentSelectionSchema }).strict();

export const organizerConsentSchema = z.object({
  email: z.string().trim().min(1).max(254).email().transform((value) => value.toLowerCase()),
  submission_key: z.uuid(),
  selection: consentSelectionSchema,
  organizer_ids: z.array(z.string().uuid()).min(1).max(100),
  preferences: z.array(z.enum(ORGANIZER_PREFERENCES)).min(1).max(3),
  consent_acknowledged: z.literal(true),
  consent_version: z.literal(CONSENT_VERSION),
  preference_version: z.literal(PREFERENCE_VERSION),
  source: z.literal(CONSENT_SOURCE),
}).strict().superRefine((value, context) => {
  for (const [field, values] of [["organizer_ids", value.organizer_ids], ["preferences", value.preferences]]) {
    if (new Set(values).size !== values.length) {
      context.addIssue({ code: "custom", path: [field], message: `${field} must not contain duplicates` });
    }
  }
});

export const n8nClaimSchema = z.object({
  limit: z.number().int().min(1).max(25),
  worker_id: z.string().trim().min(1).max(100).regex(/^[a-zA-Z0-9._-]+$/),
}).strict();

export const n8nReportSchema = z.object({
  outbox_id: z.string().uuid(),
  lease_token: z.string().min(43).max(256),
  outcome: z.enum(["completed", "failed"]),
  retryable: z.boolean().optional(),
  provider_result_id: z.string().trim().min(1).max(200).optional(),
  error_code: z.string().trim().min(1).max(80).regex(/^[a-z0-9_]+$/).optional(),
}).strict().superRefine((value, context) => {
  if (value.outcome === "completed" && !value.provider_result_id) {
    context.addIssue({ code: "custom", path: ["provider_result_id"], message: "provider_result_id is required for completion" });
  }
  if (value.outcome === "completed" && (value.retryable !== undefined || value.error_code)) {
    context.addIssue({ code: "custom", path: ["outcome"], message: "completion cannot include failure fields" });
  }
  if (value.outcome === "failed" && (!value.error_code || value.retryable === undefined || value.provider_result_id)) {
    context.addIssue({ code: "custom", path: ["outcome"], message: "failure requires retryable and error_code only" });
  }
});

export const revokeConsentSchema = z.object({
  consent_id: z.string().uuid(),
  management_token: z.string().min(43).max(256),
}).strict();
