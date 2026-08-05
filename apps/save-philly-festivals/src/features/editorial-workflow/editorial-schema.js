import { z } from "zod";

export const EDITORIAL_JSON_BODY_LIMIT = 16 * 1024;
export const festivalIdSchema = z.uuid();
export const notificationIdSchema = z.uuid();
export const workflowStateSchema = z.enum([
  "draft", "pending_review", "changes_requested", "approved", "rejected",
  "published", "unpublished", "canceled", "archived",
]);
const message = (max) => z.string().trim().min(1).max(max);

export const transitionFestivalSchema = z.object({
  expected_revision: z.number().int().nonnegative(),
  to_state: workflowStateSchema,
  reason: message(2000).optional(),
  producer_message: message(2000).optional(),
  public_message: message(1000).optional(),
}).strict();

export const listFestivalsQuerySchema = z.object({
  state: workflowStateSchema.optional(),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(24),
}).strict();

export const reviewAssetSchema = z.object({
  expected_festival_revision: z.number().int().nonnegative(),
  asset_id: z.uuid(),
  decision: z.enum(["approved", "rejected"]),
  reason: message(1000).optional(),
}).strict().superRefine((value, context) => {
  if (value.decision === "rejected" && !value.reason) {
    context.addIssue({ code: "custom", path: ["reason"], message: "A rejection reason is required" });
  }
});
