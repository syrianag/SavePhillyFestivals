import { z } from "zod";

export const SPONSOR_JSON_BODY_LIMIT = 16 * 1024;

export const sponsorIdSchema = z.uuid();
export const sponsorSlotSchema = z.enum(["left_rail", "right_rail", "footer"]);
export const sponsorStatusSchema = z.enum(["draft", "active", "archived"]);

const nullableText = (max) => z.string().trim().max(max).nullable();
/* Hex only. The value is interpolated into an inline `style`, so anything looser would let a
 * sponsor record inject arbitrary CSS. */
const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a 6-digit hex color").nullable();
/* https only — creatives are referenced by URL rather than uploaded, and the CSP allows
 * `img-src https:` but nothing else remote. */
const httpsUrl = z.string().url().max(2000).refine(
  (value) => value.startsWith("https://"),
  "Use an https:// URL"
).nullable();

/* Declared without `.default()` so the update variant can distinguish "field omitted" from
 * "field set to its default". While the defaults lived here, `.default(x).optional()` still
 * supplied `x` for an absent key, so `updateSponsorSchema.parse({})` produced
 * `{status:"draft", sort_order:0}` — an empty or partial PATCH silently unpublished an active
 * sponsor and reset its position, and the "at least one field" refine below could never fire
 * because the parsed object was never empty. Defaults are applied only in `createSponsorSchema`. */
const sponsorFields = {
  name: z.string().trim().min(1).max(200),
  slot: sponsorSlotSchema,
  status: sponsorStatusSchema,
  sort_order: z.number().int().min(0).max(9999),
  href: httpsUrl.optional(),
  alt_text: nullableText(500).optional(),
  image_url: httpsUrl.optional(),
  image_width: z.number().int().min(1).max(4000).nullable().optional(),
  image_height: z.number().int().min(1).max(4000).nullable().optional(),
  pill_color: hexColor.optional(),
  text_color: hexColor.optional(),
  starts_at: z.iso.datetime().nullable().optional(),
  ends_at: z.iso.datetime().nullable().optional(),
};

/* A sponsor must be renderable: artwork or a pill color. Without one it would occupy a slot
 * and draw nothing, which is exactly the blank-box outcome the ad slot avoids. */
const renderable = (value, context) => {
  if (!value.image_url && !value.pill_color) {
    context.addIssue({ code: "custom", path: ["image_url"], message: "Provide either a creative image URL or a pill color" });
  }
  if (value.starts_at && value.ends_at && new Date(value.ends_at) <= new Date(value.starts_at)) {
    context.addIssue({ code: "custom", path: ["ends_at"], message: "The end date must fall after the start date" });
  }
};

export const createSponsorSchema = z.object({
  ...sponsorFields,
  status: sponsorStatusSchema.default("draft"),
  sort_order: z.number().int().min(0).max(9999).default(0),
}).strict().superRefine(renderable);

export const updateSponsorSchema = z.object({
  ...Object.fromEntries(Object.entries(sponsorFields).map(([key, schema]) => [key, schema.optional()])),
}).strict().refine((value) => Object.keys(value).length > 0, {
  message: "At least one editable field is required",
});

export const listSponsorsQuerySchema = z.object({
  slot: sponsorSlotSchema.optional(),
  status: sponsorStatusSchema.optional(),
}).strict();
