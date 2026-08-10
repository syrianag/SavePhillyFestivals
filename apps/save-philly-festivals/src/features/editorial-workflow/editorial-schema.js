import { z } from "zod";

/* Reused rather than reimplemented: these are the same validators the producer submission path
 * uses, so an editor edit and a producer edit cannot disagree about what a valid date is. */
import { isCalendarDate, isExplicitNewYorkDateTime } from "@/features/producer-submission/producer-submission-schema";

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
  q: z.string().trim().max(120).optional(),
  start: z.string().refine(isCalendarDate, { message: "Use a valid YYYY-MM-DD date" }).optional(),
  end: z.string().refine(isCalendarDate, { message: "Use a valid YYYY-MM-DD date" }).optional(),
  featured: z.enum(["1", "0"]).optional(),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(24),
}).strict();

const nullableText = (max) => z.string().trim().max(max).nullable();
const nullableCalendarDate = z.string().refine(isCalendarDate, { message: "Use a valid YYYY-MM-DD date" }).nullable();
const nullableNewYorkDateTime = z.string().refine(isExplicitNewYorkDateTime, {
  message: "Use an unambiguous ISO timestamp with the correct America/New_York UTC offset",
}).nullable();

/* Editors may correct festival content in any workflow state — the producer patch endpoint is
 * scoped to its owner and to draft/changes_requested, which left imported festivals (no owner,
 * already published) uneditable by anyone.
 *
 * `workflow_state`, `revision`, `slug`, `owner_user_id`, and `status` are deliberately absent:
 * state changes stay on the transitions endpoint so `assertEditorialTransition` cannot be
 * bypassed by a content edit. */
export const updateFestivalSchema = z.object({
  expected_revision: z.number().int().nonnegative(),
  /* Required, not optional: the database permits a same-state editor edit only when the
   * accompanying transition carries a non-blank reason. That is what keeps a content
   * correction attributable instead of silent. */
  reason: message(2000),
  name: z.string().trim().min(1).max(200).optional(),
  description: nullableText(10000).optional(),
  location: nullableText(500).optional(),
  city: nullableText(100).optional(),
  state: nullableText(2).refine((value) => value === null || /^[A-Za-z]{2}$/.test(value), "Use a two-letter state code").transform((value) => value?.toUpperCase() ?? null).optional(),
  zip_code: nullableText(10).refine((value) => value === null || /^\d{5}(?:-\d{4})?$/.test(value), "Use a valid ZIP code").optional(),
  contact_name: nullableText(200).optional(),
  contact_email: z.union([z.email().max(320), z.null()]).optional(),
  contact_phone: nullableText(40).optional(),
  website_url: z.union([z.url().max(2000), z.null()]).optional(),
  image_url: z.union([z.url().max(2000), z.null()]).optional(),
  calendar_date_type: z.enum(["timed", "all_day"]).optional(),
  start_date: nullableNewYorkDateTime.optional(),
  end_date: nullableNewYorkDateTime.optional(),
  all_day_start: nullableCalendarDate.optional(),
  all_day_end: nullableCalendarDate.optional(),
  featured: z.boolean().optional(),
  featured_rank: z.number().int().min(0).max(9999).nullable().optional(),
}).strict().refine((value) => Object.keys(value).some((key) => key !== "expected_revision"), {
  message: "At least one editable field is required",
});

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
