import { z } from "zod";

export const SOCIAL_FEED_JSON_BODY_LIMIT = 16 * 1024;
export const SOCIAL_FEED_MAX_ITEMS = 100;
export const SOCIAL_FEED_MAX_RESPONSE_BYTES = 512 * 1024;

export function normalizeHashtag(value) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/^#+/, "").normalize("NFKC");
  return normalized.length > 0 ? normalized : null;
}

export const hashtagSchema = z.string().transform(normalizeHashtag).pipe(
  z.string().min(1).max(100).regex(/^[\p{L}\p{N}_]+$/u, "Hashtag may contain only letters, numbers, and underscores")
);
export const providerSchema = z.enum(["curator", "flockler"]);
export const providerFeedIdSchema = z.string().trim().min(1).max(200).regex(/^[A-Za-z0-9._:-]+$/);
export const socialFeedIdSchema = z.uuid();
export const socialPostIdSchema = z.uuid();
export const moderationStatusSchema = z.enum(["pending", "approved", "hidden", "rejected"]);

export const configureSocialFeedSchema = z.object({
  expected_revision: z.number().int().nonnegative(),
  hashtag: hashtagSchema,
  enabled: z.boolean(),
  provider: providerSchema,
  provider_feed_id: providerFeedIdSchema,
}).strict();

export const moderateSocialPostSchema = z.object({
  expected_moderation_revision: z.number().int().nonnegative(),
  status: moderationStatusSchema.exclude(["pending"]),
  reason: z.string().trim().min(1).max(1000).optional(),
}).strict().superRefine((value, context) => {
  if (["hidden", "rejected"].includes(value.status) && !value.reason) {
    context.addIssue({ code: "custom", path: ["reason"], message: "A reason is required" });
  }
});

export const listSocialPostsQuerySchema = z.object({
  status: moderationStatusSchema.optional(),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(24),
}).strict();
